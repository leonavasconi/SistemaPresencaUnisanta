// Supabase Edge Function: checkin
// Valida e grava um registro de presença. É a ÚNICA rota que escreve em
// `attendance_records` — o cliente nunca insere diretamente (ver RLS em
// 0001_init.sql), então toda a checagem de fraude vive aqui, no servidor.

import { createClient } from "jsr:@supabase/supabase-js@2";

const FACE_MATCH_THRESHOLD = 0.5; // distância euclidiana máxima entre descritores
const DESCRIPTOR_LENGTH = 128;

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
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
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

  // 1. Resolve o checkpoint pelo QR Code.
  const { data: checkpoint, error: checkpointError } = await supabase
    .from("event_checkpoints")
    .select("id, event_id, opens_at, closes_at, label")
    .eq("qr_token", payload.qrToken)
    .maybeSingle();

  if (checkpointError || !checkpoint) {
    return reject("checkpoint_nao_encontrado");
  }

  // 2. Janela de horário (3.2).
  const now = new Date();
  if (now < new Date(checkpoint.opens_at) || now > new Date(checkpoint.closes_at)) {
    return reject("fora_da_janela_de_horario");
  }

  // 3. Evento + geofence (3.3).
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, latitude, longitude, radius_meters")
    .eq("id", checkpoint.event_id)
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
  if (distance > event.radius_meters) {
    return reject("fora_da_area_do_evento", { distance_m: Math.round(distance) });
  }

  // 4. Um único registro por checkpoint (3.4).
  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("checkpoint_id", checkpoint.id)
    .eq("student_id", studentId)
    .maybeSingle();
  if (existing) {
    return reject("presenca_ja_registrada");
  }

  // 5. Fallback de exceção (3.7): 1 aparelho = 1 aluno por evento.
  const { data: deviceRow } = await supabase
    .from("device_fingerprints")
    .select("student_id")
    .eq("event_id", event.id)
    .eq("device_hash", payload.deviceHash)
    .maybeSingle();
  if (deviceRow && deviceRow.student_id !== studentId) {
    return reject("dispositivo_ja_utilizado_por_outro_aluno");
  }

  // 6. Biometria facial (3.3.c) — comparação sempre no servidor.
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("face_descriptor")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student) {
    return reject("aluno_nao_cadastrado");
  }

  const faceDistance = euclideanDistance(payload.descriptor, student.face_descriptor);
  const faceMatched = faceDistance <= FACE_MATCH_THRESHOLD;

  if (!faceMatched) {
    await supabase.from("audit_logs").insert({
      actor_id: studentId,
      action: "checkin_rejeitado",
      entity: "attendance_records",
      entity_id: checkpoint.id,
      metadata: { reason: "biometria_nao_confere", face_distance: faceDistance },
    });
    return reject("biometria_nao_confere");
  }

  // 7. Grava o registro e o fingerprint do dispositivo.
  const { error: insertError } = await supabase.from("attendance_records").insert({
    event_id: event.id,
    checkpoint_id: checkpoint.id,
    student_id: studentId,
    latitude: payload.latitude,
    longitude: payload.longitude,
    accuracy_m: payload.accuracyMeters ?? null,
    distance_m: distance,
    face_match_score: faceDistance,
    status: "approved",
    device_hash: payload.deviceHash,
  });

  if (insertError) {
    return reject("erro_ao_gravar", { detail: insertError.message });
  }

  await supabase.from("device_fingerprints").upsert(
    { event_id: event.id, student_id: studentId, device_hash: payload.deviceHash },
    { onConflict: "event_id,device_hash" },
  );

  await supabase.from("audit_logs").insert({
    actor_id: studentId,
    action: "checkin_aprovado",
    entity: "attendance_records",
    entity_id: checkpoint.id,
    metadata: { distance_m: distance, face_distance: faceDistance },
  });

  return new Response(
    JSON.stringify({ status: "approved", checkpoint: checkpoint.label }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
