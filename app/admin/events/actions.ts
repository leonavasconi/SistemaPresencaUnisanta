"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseSaoPauloDateTime, toDatetimeLocalValue } from "@/lib/datetime";
import { haversineMeters } from "@/lib/geo/haversine";
import { parseGeofencePoints, validateGeofenceTriangle } from "@/lib/geo/polygon";
import {
  checkpointLabel,
  sortCheckpointsByTime,
  validateCheckpointsSchedule,
  type CheckpointDraft,
} from "@/lib/checkpoints";

function parseCheckpoints(formData: FormData): CheckpointDraft[] {
  try {
    const raw = JSON.parse(String(formData.get("checkpoints") ?? "[]"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/** Ordena por horário e gera o rótulo/ordem definitivos (Momento 1 = mais cedo). */
function normalizeCheckpoints(checkpoints: CheckpointDraft[]) {
  return sortCheckpointsByTime(checkpoints).map((cp, position) => ({
    ...cp,
    label: checkpointLabel(position),
    order: position + 1,
  }));
}

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/entrar");

  const name = String(formData.get("name"));
  const description = String(formData.get("description") ?? "");
  const startsAt = String(formData.get("startsAt"));
  const endsAt = String(formData.get("endsAt"));

  let rawPoints: unknown = [];
  try {
    rawPoints = JSON.parse(String(formData.get("geofencePoints") ?? "[]"));
  } catch {
    rawPoints = [];
  }

  // O servidor é a fonte da verdade: mesmo que o formulário deixe passar, a
  // área precisa ser um triângulo válido antes de virar evento.
  const geofencePoints = parseGeofencePoints(rawPoints);
  const geofenceError = validateGeofenceTriangle(geofencePoints);
  if (geofenceError) {
    redirect(`/admin/events/new?error=${encodeURIComponent(geofenceError)}`);
  }

  const checkpoints = parseCheckpoints(formData);
  const checkpointsError = validateCheckpointsSchedule(checkpoints, startsAt, endsAt);
  if (checkpointsError) {
    redirect(`/admin/events/new?error=${encodeURIComponent(checkpointsError)}`);
  }

  // Quem decide o check-in é o triângulo (`pontos_geofence`). Centro e raio
  // continuam sendo gravados porque as colunas são NOT NULL desde o schema
  // inicial e alimentam a distância registrada na auditoria — o centro é o
  // centroide dos pontos e o raio cobre o vértice mais distante dele.
  const latitude = geofencePoints.reduce((sum, p) => sum + p.lat, 0) / geofencePoints.length;
  const longitude = geofencePoints.reduce((sum, p) => sum + p.lng, 0) / geofencePoints.length;
  const maxDistance = Math.max(
    ...geofencePoints.map((p) => haversineMeters(latitude, longitude, p.lat, p.lng)),
  );
  const radiusMeters = Math.ceil(maxDistance);

  // Para testar só a interface sem o Supabase: comente o bloco abaixo (insert
  // + tratamento de erro) e troque por um `redirect("/admin/events")` fixo.
  const { data, error } = await supabase
    .from("eventos")
    .insert({
      nome: name,
      descricao: description,
      latitude,
      longitude,
      raio_metros: radiusMeters,
      pontos_geofence: geofencePoints,
      inicio_em: parseSaoPauloDateTime(startsAt).toISOString(),
      fim_em: parseSaoPauloDateTime(endsAt).toISOString(),
      criado_por: user!.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/admin/events/new?error=${encodeURIComponent(error?.message ?? "Erro ao criar evento")}`);
  }

  const { error: checkpointsInsertError } = await supabase.from("momentos_presenca").insert(
    normalizeCheckpoints(checkpoints).map((cp) => ({
      evento_id: data.id,
      rotulo: cp.label,
      abre_em: parseSaoPauloDateTime(cp.opensAt).toISOString(),
      fecha_em: parseSaoPauloDateTime(cp.closesAt).toISOString(),
      ordem: cp.order,
    })),
  );

  if (checkpointsInsertError) {
    redirect(`/admin/events/${data.id}?error=${encodeURIComponent(checkpointsInsertError.message)}`);
  }

  redirect(`/admin/events/${data.id}`);
}

/**
 * Sincroniza a lista inteira de momentos de um evento com o banco: remove os que
 * não estão mais na lista, atualiza os existentes e insere os novos. Usado tanto
 * na tela de momentos/QR quanto no painel do evento, com a mesma UI de edição.
 */
export async function syncCheckpoints(eventId: string, redirectPath: string, formData: FormData) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("eventos")
    .select("inicio_em, fim_em")
    .eq("id", eventId)
    .maybeSingle();

  const checkpoints = parseCheckpoints(formData);
  const checkpointsError = validateCheckpointsSchedule(
    checkpoints,
    event ? toDatetimeLocalValue(new Date(event.inicio_em)) : "",
    event ? toDatetimeLocalValue(new Date(event.fim_em)) : "",
  );
  if (checkpointsError) {
    redirect(`${redirectPath}?error=${encodeURIComponent(checkpointsError)}`);
  }

  const { data: existing } = await supabase
    .from("momentos_presenca")
    .select("id")
    .eq("evento_id", eventId);

  const existingIds = new Set((existing ?? []).map((row) => row.id));
  const keepIds = new Set(checkpoints.filter((cp) => cp.id).map((cp) => cp.id!));
  const idsToDelete = [...existingIds].filter((id) => !keepIds.has(id));

  if (idsToDelete.length > 0) {
    await supabase.from("momentos_presenca").delete().in("id", idsToDelete);
  }

  for (const cp of normalizeCheckpoints(checkpoints)) {
    const payload = {
      rotulo: cp.label,
      abre_em: parseSaoPauloDateTime(cp.opensAt).toISOString(),
      fecha_em: parseSaoPauloDateTime(cp.closesAt).toISOString(),
      ordem: cp.order,
    };

    const { error } =
      cp.id && existingIds.has(cp.id)
        ? await supabase.from("momentos_presenca").update(payload).eq("id", cp.id)
        : await supabase.from("momentos_presenca").insert({ ...payload, evento_id: eventId });

    if (error) {
      redirect(`${redirectPath}?error=${encodeURIComponent(error.message)}`);
    }
  }

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/moments`);
}

