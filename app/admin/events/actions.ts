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
  if (!user) redirect("/admin/login");

  const name = String(formData.get("name"));
  const description = String(formData.get("description") ?? "");
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const radiusMeters = Number(formData.get("radiusMeters"));
  const startsAt = String(formData.get("startsAt"));
  const endsAt = String(formData.get("endsAt"));

  const { data, error } = await supabase
    .from("events")
    .insert({
      name,
      description,
      latitude,
      longitude,
      radius_meters: radiusMeters,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/admin/events/new?error=${encodeURIComponent(error?.message ?? "Erro ao criar evento")}`);
  }

  redirect(`/admin/events/${data.id}/checkpoints`);
}

export async function addCheckpoint(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const label = String(formData.get("label"));
  const opensAt = String(formData.get("opensAt"));
  const closesAt = String(formData.get("closesAt"));
  const orderIndex = Number(formData.get("orderIndex") ?? 0);

  const { error } = await supabase.from("event_checkpoints").insert({
    event_id: eventId,
    label,
    opens_at: new Date(opensAt).toISOString(),
    closes_at: new Date(closesAt).toISOString(),
    order_index: orderIndex,
  });

  if (error) {
    redirect(
      `/admin/events/${eventId}/checkpoints?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/admin/events/${eventId}/checkpoints`);
}

export async function deleteCheckpoint(eventId: string, checkpointId: string) {
  const supabase = await createClient();
  await supabase.from("event_checkpoints").delete().eq("id", checkpointId);
  revalidatePath(`/admin/events/${eventId}/checkpoints`);
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
    .from("event_checkpoints")
    .update({
      label,
      opens_at: new Date(opensAt).toISOString(),
      closes_at: new Date(closesAt).toISOString(),
    })
    .eq("id", checkpointId);

  if (error) {
    redirect(`/admin/events/${eventId}/checkpoints?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/admin/events/${eventId}/checkpoints`);
}

export async function applyCheckpointPreset(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const preset = String(formData.get("preset")) as CheckpointPreset;

  const { data: event } = await supabase
    .from("events")
    .select("starts_at, ends_at")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    redirect(`/admin/events/${eventId}/checkpoints?error=${encodeURIComponent("Evento não encontrado")}`);
  }

  const { data: lastCheckpoint } = await supabase
    .from("event_checkpoints")
    .select("order_index")
    .eq("event_id", eventId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextOrderIndex = (lastCheckpoint?.order_index ?? 0) + 1;

  const checkpoints = computeCheckpointsForPreset(
    preset,
    new Date(event!.starts_at),
    new Date(event!.ends_at),
  );

  const { error } = await supabase.from("event_checkpoints").insert(
    checkpoints.map((cp) => ({
      event_id: eventId,
      label: cp.label,
      opens_at: cp.opensAt.toISOString(),
      closes_at: cp.closesAt.toISOString(),
      order_index: nextOrderIndex++,
    })),
  );

  if (error) {
    redirect(`/admin/events/${eventId}/checkpoints?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/admin/events/${eventId}/checkpoints`);
}
