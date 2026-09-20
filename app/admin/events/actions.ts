"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
import { parseSaoPauloDateTime, toDatetimeLocalValue } from "@/lib/datetime";
import { haversineMeters } from "@/lib/geo/haversine";
import { parseGeofencePoints, validateGeofenceArea, type GeoPoint } from "@/lib/geo/polygon";
import {
  checkpointLabel,
  sortCheckpointsByTime,
  validateCheckpointsSchedule,
  validateLockedCheckpoints,
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

/**
 * Centro (centroide) e raio (distância até o vértice mais distante) de uma
 * área de pontos — usados como fallback de círculo para a Edge Function e
 * para a distância registrada na auditoria. Sem pontos, não há área ainda:
 * ambos ficam nulos.
 */
function centroidAndRadius(points: GeoPoint[]) {
  if (points.length === 0) {
    return { latitude: null, longitude: null, radiusMeters: null };
  }
  const latitude = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const longitude = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
  const maxDistance = Math.max(...points.map((p) => haversineMeters(latitude, longitude, p.lat, p.lng)));
  return { latitude, longitude, radiusMeters: Math.ceil(maxDistance) };
}

/** Assinatura de um conjunto de pontos — dois locais só "são o mesmo" se tiverem exatamente as mesmas coordenadas, em qualquer ordem. */
function geofencePointsSignature(points: GeoPoint[]): string {
  return points
    .map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`)
    .sort()
    .join("|");
}

/** Duas janelas se cruzam; um evento terminando exatamente quando o outro começa não conta como conflito. */
function schedulesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Impede 2 eventos na mesma janela de horário usando o mesmo local: mesmo com
 * títulos diferentes (uma prova, uma palestra), ninguém pode estar fisicamente
 * em 2 lugares ao mesmo tempo. Eventos sem área definida não entram nesta
 * checagem — nem como origem (nada para comparar) nem como possível conflito.
 */
async function findLocationTimeConflict(
  supabase: SupabaseClient,
  params: { excludeEventId?: string; points: GeoPoint[]; startsAt: Date; endsAt: Date },
): Promise<string | null> {
  if (params.points.length === 0) return null;

  let query = supabase.from("eventos").select("id, nome, inicio_em, fim_em, pontos_geofence");
  if (params.excludeEventId) query = query.neq("id", params.excludeEventId);
  const { data: otherEvents } = await query;

  const signature = geofencePointsSignature(params.points);
  const conflict = (otherEvents ?? []).find((other) => {
    const otherPoints = parseGeofencePoints(other.pontos_geofence);
    if (otherPoints.length === 0 || geofencePointsSignature(otherPoints) !== signature) return false;
    return schedulesOverlap(
      params.startsAt,
      params.endsAt,
      new Date(other.inicio_em),
      new Date(other.fim_em),
    );
  });

  return conflict
    ? `Já existe o evento "${conflict.nome}" no mesmo local com horário conflitante.`
    : null;
}

/** Locais salvos (ex: "Sala 420A"), para o combobox de reaproveitar área. */
export async function getGeofencePresets() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("locais_geofence")
    .select("id, nome, pontos")
    .order("nome", { ascending: true });
  return data ?? [];
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
  // área (quando informada) precisa ser válida antes de virar evento. A área
  // em si é opcional aqui — o admin pode adiantar o cadastro e marcar os
  // pontos depois, presencialmente, na tela do evento.
  const geofencePoints = parseGeofencePoints(rawPoints);
  const geofenceError = validateGeofenceArea(geofencePoints, false);
  if (geofenceError) {
    redirect(`/admin/events/new?error=${encodeURIComponent(geofenceError)}`);
  }

  const checkpoints = parseCheckpoints(formData);
  const checkpointsError = validateCheckpointsSchedule(checkpoints, startsAt, endsAt);
  if (checkpointsError) {
    redirect(`/admin/events/new?error=${encodeURIComponent(checkpointsError)}`);
  }

  const parsedStartsAt = parseSaoPauloDateTime(startsAt);
  const parsedEndsAt = parseSaoPauloDateTime(endsAt);
  const conflictError = await findLocationTimeConflict(supabase, {
    points: geofencePoints,
    startsAt: parsedStartsAt,
    endsAt: parsedEndsAt,
  });
  if (conflictError) {
    redirect(`/admin/events/new?error=${encodeURIComponent(conflictError)}`);
  }

  // Quem decide o check-in é o polígono (`pontos_geofence`). Centro e raio
  // ficam nulos até a área ser definida; uma vez definidos, o centro é o
  // centroide dos pontos e o raio cobre o vértice mais distante dele.
  const { latitude, longitude, radiusMeters } = centroidAndRadius(geofencePoints);

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
      inicio_em: parsedStartsAt.toISOString(),
      fim_em: parsedEndsAt.toISOString(),
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
    .select("id, abre_em, fecha_em")
    .eq("evento_id", eventId);

  // Momento com presença registrada não pode ter horário mudado nem ser
  // removido — só dá pra acrescentar novos momentos depois do último já usado.
  const { data: registros } = await supabase
    .from("registros_presenca")
    .select("momento_id")
    .eq("evento_id", eventId);
  const registeredMomentIds = new Set((registros ?? []).map((r) => r.momento_id));

  const locked = (existing ?? [])
    .filter((cp) => registeredMomentIds.has(cp.id))
    .map((cp) => ({
      id: cp.id,
      opensAt: toDatetimeLocalValue(new Date(cp.abre_em)),
      closesAt: toDatetimeLocalValue(new Date(cp.fecha_em)),
    }));

  const lockedError = validateLockedCheckpoints(checkpoints, locked);
  if (lockedError) {
    redirect(`${redirectPath}?error=${encodeURIComponent(lockedError)}`);
  }

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

/**
 * Salva a área atual como um local reaproveitável (ex: "Sala 420A"), visível
 * para todos os admins na próxima vez que criarem ou editarem um evento.
 * Chamada diretamente pelo client (não por um `<form>`) a partir do
 * `GeofenceEditor`.
 */
export async function createGeofencePreset(name: string, points: GeoPoint[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/entrar");

  const trimmedName = name.trim();
  if (!trimmedName) return { error: "Dê um nome ao local antes de salvar." };

  const geofenceError = validateGeofenceArea(points, true);
  if (geofenceError) return { error: geofenceError };

  // Mesma área, nome diferente (ex: "420" e "420A" com as mesmas coordenadas)
  // é o mesmo local duplicado — reaproveitar o já salvo evita bagunçar a lista.
  const { data: existingPresets } = await supabase.from("locais_geofence").select("nome, pontos");
  const newSignature = geofencePointsSignature(points);
  const duplicate = (existingPresets ?? []).find(
    (preset) => geofencePointsSignature(parseGeofencePoints(preset.pontos)) === newSignature,
  );
  if (duplicate) {
    return {
      error: `Esses pontos já estão salvos como "${duplicate.nome}". Reaproveite esse local em vez de salvar de novo com outro nome.`,
    };
  }

  const { error } = await supabase.from("locais_geofence").insert({
    nome: trimmedName,
    pontos: points,
    criado_por: user.id,
  });

  if (error) {
    return {
      error: error.code === "23505" ? "Já existe um local salvo com esse nome." : error.message,
    };
  }

  revalidatePath("/admin/events/new");
  return { error: null };
}

/**
 * Define (ou corrige) a área de um evento já existente. Ao contrário da
 * criação, aqui a área é obrigatória — é essa a única finalidade da tela.
 * Chamada diretamente pelo client (não por um `<form>`), a partir do
 * `GeofencePanel` — assim o painel controla o próprio estado de carregamento
 * e erro, e o `router.refresh()` que segue preserva o restante da tela (o
 * combobox de local reaproveitado, por exemplo) em vez de recarregar tudo
 * via navegação de formulário nativa.
 */
export async function updateEventGeofence(eventId: string, points: GeoPoint[]) {
  const supabase = await createClient();

  const geofenceError = validateGeofenceArea(points, true);
  if (geofenceError) return { error: geofenceError };

  const { data: event } = await supabase
    .from("eventos")
    .select("inicio_em, fim_em")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { error: "Evento não encontrado." };

  const conflictError = await findLocationTimeConflict(supabase, {
    excludeEventId: eventId,
    points,
    startsAt: new Date(event.inicio_em),
    endsAt: new Date(event.fim_em),
  });
  if (conflictError) return { error: conflictError };

  const { latitude, longitude, radiusMeters } = centroidAndRadius(points);

  const { error } = await supabase
    .from("eventos")
    .update({
      latitude,
      longitude,
      raio_metros: radiusMeters,
      pontos_geofence: points,
    })
    .eq("id", eventId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/events/${eventId}`);
  return { error: null };
}

