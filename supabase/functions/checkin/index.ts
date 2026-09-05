// Supabase Edge Function: checkin
// Valida e grava um registro de presença. É a ÚNICA rota que escreve em
// `registros_presenca` — o cliente nunca insere diretamente (ver RLS em
// 0001_init.sql), então toda a checagem de fraude vive aqui, no servidor.

import { createClient } from "jsr:@supabase/supabase-js@2";

const FACE_MATCH_THRESHOLD = 0.5; // distância euclidiana máxima entre descritores
const DESCRIPTOR_LENGTH = 128;

// Margem aplicada para fora da borda da área do evento, para absorver o erro
// do GPS (que dentro de prédios passa de 10 m com folga). Usamos a precisão
// informada pelo próprio aparelho, limitada a este teto para que um aparelho
// com leitura ruim não consiga aprovar presença de qualquer lugar.
const MAX_GPS_TOLERANCE_M = 30;

// Necessário porque o navegador do participante chama este domínio
// (supabase.co) a partir de outra origem (o app Next.js) — sem isso o
// navegador bloqueia a resposta antes mesmo de a página conseguir lê-la.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Código do Postgres para violação de unique — aqui, a constraint
// (momento_id, participante_id), que é a garantia final contra presença
// duplicada quando duas requisições chegam ao mesmo tempo.
const UNIQUE_VIOLATION = "23505";

interface CheckinPayload {
  qrToken: string;
  descriptor: number[];
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  deviceHash: string;
}

type GeoPoint = { lat: number; lng: number };

// A geometria abaixo espelha `lib/geo/polygon.ts` do app Next. São runtimes
// separados (Deno x Node) sem módulo compartilhado — o mesmo motivo pelo qual
// `haversineMeters` já vivia duplicado aqui. Ao mexer em uma, mexa na outra.

const EARTH_RADIUS_M = 6371000;
const toRad = (v: number) => (v * Math.PI) / 180;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Projeta lat/lng em metros num plano local; o cos(lat) corrige o encurtamento dos graus de longitude. */
function projectToMeters(point: GeoPoint, origin: GeoPoint) {
  return {
    x: EARTH_RADIUS_M * toRad(point.lng - origin.lng) * Math.cos(toRad(origin.lat)),
    y: EARTH_RADIUS_M * toRad(point.lat - origin.lat),
  };
}

function distanceToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Ray casting — número ímpar de cruzamentos com as arestas significa "dentro". */
function checkPointInArea(point: GeoPoint, polygon: GeoPoint[], toleranceMeters: number) {
  if (polygon.length < 3) return { inside: false, distanceToEdgeMeters: Infinity };

  const origin = polygon[0];
  const p = projectToMeters(point, origin);
  const vertices = polygon.map((v) => projectToMeters(v, origin));

  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const { x: xi, y: yi } = vertices[i];
    const { x: xj, y: yj } = vertices[j];
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  if (inside) return { inside: true, distanceToEdgeMeters: 0 };

  let shortest = Infinity;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    shortest = Math.min(shortest, distanceToSegment(p, vertices[j], vertices[i]));
  }
  return { inside: shortest <= toleranceMeters, distanceToEdgeMeters: shortest };
}

function parseGeofencePoints(raw: unknown): GeoPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is GeoPoint =>
      !!p && typeof p === "object" && Number.isFinite(p.lat) && Number.isFinite(p.lng),
  );
}

const MIN_GEOFENCE_AREA_M2 = 25;

/** Área do polígono em m² (shoelace, sobre o plano projetado). */
function polygonAreaSquareMeters(points: GeoPoint[]) {
  if (points.length < 3) return 0;
  const vertices = points.map((p) => projectToMeters(p, points[0]));
  let sum = 0;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    sum += vertices[j].x * vertices[i].y - vertices[i].x * vertices[j].y;
  }
  return Math.abs(sum) / 2;
}

/**
 * Existem eventos gravados com 3 pontos idênticos (o organizador clicou em
 * "adicionar ponto com minha localização" três vezes parado no mesmo lugar),
 * cuja área é zero. Validar por um polígono desses reprovaria todo mundo —
 * então tratamos como "sem área definida" e recaímos no círculo centro+raio,
 * que era exatamente como esses eventos já funcionavam.
 */
function isUsableGeofence(points: GeoPoint[]) {
  return points.length >= 3 && polygonAreaSquareMeters(points) >= MIN_GEOFENCE_AREA_M2;
}

function euclideanDistance(a: number[], b: number[]) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

function json(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function reject(reason: string, extra: Record<string, unknown> = {}) {
  return json({ status: "rejected", reason, ...extra });
}

/** Presença que já existia: não é erro nem novo registro — é o estado atual. */
function alreadyRegistered(checkpointLabel: string, recordedAt?: string) {
  return json({ status: "already_registered", checkpoint: checkpointLabel, recordedAt });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Identifica o participante a partir do JWT enviado pelo app.
  const anonForAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await anonForAuth.auth.getUser();
  if (userError || !userData?.user) {
    return reject("nao_autenticado");
  }
  const participantId = userData.user.id;

  let payload: CheckinPayload;
  try {
    payload = await req.json();
  } catch {
    return reject("payload_invalido");
  }

  if (
    !payload.qrToken ||
    !Array.isArray(payload.descriptor) ||
    payload.descriptor.length !== DESCRIPTOR_LENGTH ||
    typeof payload.latitude !== "number" ||
    typeof payload.longitude !== "number" ||
    !Number.isFinite(payload.latitude) ||
    !Number.isFinite(payload.longitude) ||
    !payload.deviceHash
  ) {
    return reject("payload_invalido");
  }

  // 1. Resolve o momento de presença pelo QR Code.
  const { data: checkpoint, error: checkpointError } = await supabase
    .from("momentos_presenca")
    .select("id, evento_id, abre_em, fecha_em, rotulo")
    .eq("token_qr", payload.qrToken)
    .maybeSingle();

  if (checkpointError || !checkpoint) {
    return reject("checkpoint_nao_encontrado");
  }

  // 2. Um único registro por momento (3.4). Vem antes de tudo: se a presença
  //    já está registrada, o participante deve ver o estado confirmado, não
  //    ser mandado repetir a selfie para receber uma recusa no fim.
  const { data: existing } = await supabase
    .from("registros_presenca")
    .select("id, registrado_em")
    .eq("momento_id", checkpoint.id)
    .eq("participante_id", participantId)
    .maybeSingle();
  if (existing) {
    return alreadyRegistered(checkpoint.rotulo, existing.registrado_em);
  }

  // 3. Janela de horário (3.2).
  const now = new Date();
  if (now < new Date(checkpoint.abre_em) || now > new Date(checkpoint.fecha_em)) {
    return reject("fora_da_janela_de_horario");
  }

  // 4. Evento + área (3.3).
  const { data: event, error: eventError } = await supabase
    .from("eventos")
    .select("id, latitude, longitude, raio_metros, pontos_geofence")
    .eq("id", checkpoint.evento_id)
    .maybeSingle();

  if (eventError || !event) {
    return reject("evento_nao_encontrado");
  }

  const tolerance = Math.min(payload.accuracyMeters ?? 0, MAX_GPS_TOLERANCE_M);
  const geofencePoints = parseGeofencePoints(event.pontos_geofence);
  const participantPoint = { lat: payload.latitude, lng: payload.longitude };

  // Distância até o centro, mantida para o registro de auditoria nos dois
  // caminhos de validação.
  const distanceToCenter = haversineMeters(
    payload.latitude,
    payload.longitude,
    event.latitude,
    event.longitude,
  );

  if (isUsableGeofence(geofencePoints)) {
    // Caminho novo: a área é o polígono desenhado pelo admin (3 pontos = um
    // triângulo). É ele que decide dentro/fora — não a distância a um centro.
    const area = checkPointInArea(participantPoint, geofencePoints, tolerance);
    if (!area.inside) {
      return reject("fora_da_area_do_evento", {
        distance_m: Math.round(area.distanceToEdgeMeters),
      });
    }
  } else {
    // Eventos criados antes de a área por pontos existir (ou com área
    // degenerada) só têm centro e raio: continuam validando por círculo, para
    // não deixarem de funcionar.
    if (distanceToCenter > event.raio_metros + tolerance) {
      return reject("fora_da_area_do_evento", { distance_m: Math.round(distanceToCenter) });
    }
  }

  // 5. Fallback de exceção (3.7): 1 aparelho = 1 participante por evento.
  const { data: deviceRow } = await supabase
    .from("dispositivos")
    .select("participante_id")
    .eq("evento_id", event.id)
    .eq("hash_dispositivo", payload.deviceHash)
    .maybeSingle();
  if (deviceRow && deviceRow.participante_id !== participantId) {
    return reject("dispositivo_ja_utilizado_por_outro_participante");
  }

  // 6. Biometria facial (3.3.c) — comparação sempre no servidor.
  const { data: participant, error: participantError } = await supabase
    .from("participantes")
    .select("descritor_facial")
    .eq("id", participantId)
    .maybeSingle();

  if (participantError || !participant) {
    return reject("participante_nao_cadastrado");
  }

  // Quem criou a conta mas ainda não fez a etapa de biometria tem o descritor
  // vazio — comparar contra ele daria uma distância enorme e a mensagem errada
  // ("biometria não confere" em vez de "conclua seu cadastro").
  if (
    !Array.isArray(participant.descritor_facial) ||
    participant.descritor_facial.length !== DESCRIPTOR_LENGTH
  ) {
    return reject("participante_nao_cadastrado");
  }

  const faceDistance = euclideanDistance(payload.descriptor, participant.descritor_facial);

  if (faceDistance > FACE_MATCH_THRESHOLD) {
    await supabase.from("logs_auditoria").insert({
      ator_id: participantId,
      acao: "presenca_rejeitada",
      entidade: "registros_presenca",
      entidade_id: checkpoint.id,
      metadados: { reason: "biometria_nao_confere", face_distance: faceDistance },
    });
    return reject("biometria_nao_confere");
  }

  // 7. Grava o registro e o fingerprint do dispositivo.
  const { error: insertError } = await supabase.from("registros_presenca").insert({
    evento_id: event.id,
    momento_id: checkpoint.id,
    participante_id: participantId,
    latitude: payload.latitude,
    longitude: payload.longitude,
    precisao_m: payload.accuracyMeters ?? null,
    distancia_m: distanceToCenter,
    pontuacao_facial: faceDistance,
    situacao: "aprovado",
    hash_dispositivo: payload.deviceHash,
  });

  if (insertError) {
    // Duas requisições simultâneas do mesmo participante (dois cliques, duas
    // abas): a constraint unique barra a segunda. O estado real é "presença
    // registrada", então é isso que respondemos — e não um erro.
    if (insertError.code === UNIQUE_VIOLATION) {
      return alreadyRegistered(checkpoint.rotulo);
    }
    return reject("erro_ao_gravar", { detail: insertError.message });
  }

  await supabase.from("dispositivos").upsert(
    { evento_id: event.id, participante_id: participantId, hash_dispositivo: payload.deviceHash },
    { onConflict: "evento_id,hash_dispositivo" },
  );

  await supabase.from("logs_auditoria").insert({
    ator_id: participantId,
    acao: "presenca_aprovada",
    entidade: "registros_presenca",
    entidade_id: checkpoint.id,
    metadados: { distance_m: distanceToCenter, face_distance: faceDistance },
  });

  return json({ status: "approved", checkpoint: checkpoint.rotulo });
});
