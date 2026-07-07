"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeCheckpointsForPreset, type CheckpointPreset } from "@/lib/checkpointPresets";

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/entrar");

  const name = String(formData.get("name"));
  const description = String(formData.get("description") ?? "");
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const radiusMeters = Number(formData.get("radiusMeters"));
  const startsAt = String(formData.get("startsAt"));
  const endsAt = String(formData.get("endsAt"));

  const { data, error } = await supabase
    .from("eventos")
    .insert({
      nome: name,
      descricao: description,
      latitude,
      longitude,
      raio_metros: radiusMeters,
      inicio_em: new Date(startsAt).toISOString(),
      fim_em: new Date(endsAt).toISOString(),
      criado_por: user!.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/admin/eventos/novo?error=${encodeURIComponent(error?.message ?? "Erro ao criar evento")}`);
  }

  redirect(`/admin/eventos/${data.id}/momentos`);
}

export async function addCheckpoint(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const label = String(formData.get("label"));
  const opensAt = String(formData.get("opensAt"));
  const closesAt = String(formData.get("closesAt"));
  const orderIndex = Number(formData.get("orderIndex") ?? 0);

  const { error } = await supabase.from("momentos_presenca").insert({
    evento_id: eventId,
    rotulo: label,
    abre_em: new Date(opensAt).toISOString(),
    fecha_em: new Date(closesAt).toISOString(),
    ordem: orderIndex,
  });

  if (error) {
    redirect(
      `/admin/eventos/${eventId}/momentos?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/admin/eventos/${eventId}/momentos`);
}

export async function deleteCheckpoint(eventId: string, checkpointId: string) {
  const supabase = await createClient();
  await supabase.from("momentos_presenca").delete().eq("id", checkpointId);
  revalidatePath(`/admin/eventos/${eventId}/momentos`);
}

export async function updateCheckpoint(
  eventId: string,
  checkpointId: string,
  formData: FormData,
) {
  const supabase = await createClient();

  const label = String(formData.get("label"));
  const opensAt = String(formData.get("opensAt"));
  const closesAt = String(formData.get("closesAt"));

  const { error } = await supabase
    .from("momentos_presenca")
    .update({
      rotulo: label,
      abre_em: new Date(opensAt).toISOString(),
      fecha_em: new Date(closesAt).toISOString(),
    })
    .eq("id", checkpointId);

  if (error) {
    redirect(`/admin/eventos/${eventId}/momentos?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/admin/eventos/${eventId}/momentos`);
}

export async function applyCheckpointPreset(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const preset = String(formData.get("preset")) as CheckpointPreset;

  const { data: event } = await supabase
    .from("eventos")
    .select("inicio_em, fim_em")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    redirect(`/admin/eventos/${eventId}/momentos?error=${encodeURIComponent("Evento não encontrado")}`);
  }

  const { data: lastCheckpoint } = await supabase
    .from("momentos_presenca")
    .select("ordem")
    .eq("evento_id", eventId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextOrderIndex = (lastCheckpoint?.ordem ?? 0) + 1;

  const checkpoints = computeCheckpointsForPreset(
    preset,
    new Date(event!.inicio_em),
    new Date(event!.fim_em),
  );

  const { error } = await supabase.from("momentos_presenca").insert(
    checkpoints.map((cp) => ({
      evento_id: eventId,
      rotulo: cp.label,
      abre_em: cp.opensAt.toISOString(),
      fecha_em: cp.closesAt.toISOString(),
      ordem: nextOrderIndex++,
    })),
  );

  if (error) {
    redirect(`/admin/eventos/${eventId}/momentos?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/admin/eventos/${eventId}/momentos`);
}
