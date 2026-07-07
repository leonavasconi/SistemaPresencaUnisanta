// Supabase Edge Function: checkin
// Valida e grava um registro de presença. É a ÚNICA rota que escreve em
// `registros_presenca` — o cliente nunca insere diretamente (ver RLS em
// 0001_init.sql), então toda a checagem de fraude vive aqui, no servidor.

import { createClient } from "jsr:@supabase/supabase-js@2";

const FACE_MATCH_THRESHOLD = 0.5; // distância euclidiana máxima entre descritores
const DESCRIPTOR_LENGTH = 128;

// Necessário porque o navegador do aluno chama este domínio (supabase.co) a
// partir de outra origem (o app Next.js) — sem isso o navegador bloqueia a
// resposta antes mesmo de o código da página conseguir lê-la.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CheckinPayload {
  qrToken: string;
  descriptor: number[];
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  deviceHash: string;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function euclideanDistance(a: number[], b: number[]) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

function reject(reason: string, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ status: "rejected", reason, ...extra }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
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

  // Identifica o aluno a partir do JWT enviado pelo app (login do aluno).
  const anonForAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await anonForAuth.auth.getUser();
  if (userError || !userData?.user) {
    return reject("nao_autenticado");
  }
  const studentId = userData.user.id;

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

  // 2. Janela de horário (3.2).
  const now = new Date();
  if (now < new Date(checkpoint.abre_em) || now > new Date(checkpoint.fecha_em)) {
    return reject("fora_da_janela_de_horario");
  }

  // 3. Evento + geofence (3.3).
  const { data: event, error: eventError } = await supabase
    .from("eventos")
    .select("id, latitude, longitude, raio_metros")
    .eq("id", checkpoint.evento_id)
    .maybeSingle();

  if (eventError || !event) {
    return reject("evento_nao_encontrado");
  }

  const distance = haversineMeters(
    payload.latitude,
    payload.longitude,
    event.latitude,
    event.longitude,
  );
  if (distance > event.raio_metros) {
    return reject("fora_da_area_do_evento", { distance_m: Math.round(distance) });
  }

  // 4. Um único registro por momento (3.4).
  const { data: existing } = await supabase
    .from("registros_presenca")
    .select("id")
    .eq("momento_id", checkpoint.id)
    .eq("aluno_id", studentId)
    .maybeSingle();
  if (existing) {
    return reject("presenca_ja_registrada");
  }

  // 5. Fallback de exceção (3.7): 1 aparelho = 1 aluno por evento.
  const { data: deviceRow } = await supabase
    .from("dispositivos")
    .select("aluno_id")
    .eq("evento_id", event.id)
    .eq("hash_dispositivo", payload.deviceHash)
    .maybeSingle();
  if (deviceRow && deviceRow.aluno_id !== studentId) {
    return reject("dispositivo_ja_utilizado_por_outro_aluno");
  }

  // 6. Biometria facial (3.3.c) — comparação sempre no servidor.
  const { data: student, error: studentError } = await supabase
    .from("alunos")
    .select("descritor_facial")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student) {
    return reject("aluno_nao_cadastrado");
  }

  const faceDistance = euclideanDistance(payload.descriptor, student.descritor_facial);
  const faceMatched = faceDistance <= FACE_MATCH_THRESHOLD;

  if (!faceMatched) {
    await supabase.from("logs_auditoria").insert({
      ator_id: studentId,
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
    aluno_id: studentId,
    latitude: payload.latitude,
    longitude: payload.longitude,
    precisao_m: payload.accuracyMeters ?? null,
    distancia_m: distance,
    pontuacao_facial: faceDistance,
    situacao: "aprovado",
    hash_dispositivo: payload.deviceHash,
  });

  if (insertError) {
    return reject("erro_ao_gravar", { detail: insertError.message });
  }

  await supabase.from("dispositivos").upsert(
    { evento_id: event.id, aluno_id: studentId, hash_dispositivo: payload.deviceHash },
    { onConflict: "evento_id,hash_dispositivo" },
  );

  await supabase.from("logs_auditoria").insert({
    ator_id: studentId,
    acao: "presenca_aprovada",
    entidade: "registros_presenca",
    entidade_id: checkpoint.id,
    metadados: { distance_m: distance, face_distance: faceDistance },
  });

  return new Response(
    JSON.stringify({ status: "approved", checkpoint: checkpoint.rotulo }),
    { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
  );
});
