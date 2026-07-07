"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
