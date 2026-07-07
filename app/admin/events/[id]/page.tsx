import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function EventDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, description, starts_at, ends_at, radius_meters")
    .eq("id", eventId)
    .maybeSingle();

  const { data: checkpoints } = await supabase
    .from("event_checkpoints")
    .select("id, label, order_index")
    .eq("event_id", eventId)
    .order("order_index", { ascending: true });

  const { data: records } = await supabase
    .from("attendance_records")
    .select("id, checkpoint_id, recorded_at, distance_m, status, students(full_name, matricula, course)")
    .eq("event_id", eventId)
    .order("recorded_at", { ascending: false });

  const countByCheckpoint = new Map<string, number>();
  for (const r of records ?? []) {
    countByCheckpoint.set(r.checkpoint_id, (countByCheckpoint.get(r.checkpoint_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-unisanta-navy">{event?.name}</h1>
          <p className="text-sm text-zinc-500">
            {event && `${new Date(event.starts_at).toLocaleString("pt-BR")} — ${new Date(event.ends_at).toLocaleString("pt-BR")}`}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/admin/events/${eventId}/checkpoints`}
            className="rounded-lg border border-unisanta-navy px-4 py-2 text-sm font-medium text-unisanta-navy hover:bg-unisanta-navy hover:text-white"
          >
            Gerenciar momentos / QR
          </Link>
          <a
            href={`/admin/events/${eventId}/export`}
            className="rounded-lg bg-unisanta-red px-4 py-2 text-sm font-medium text-white hover:bg-unisanta-red-dark"
          >
            Exportar CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(checkpoints ?? []).map((cp) => (
          <div key={cp.id} className="rounded-xl bg-white p-4 text-center ring-1 ring-zinc-100">
            <p className="text-2xl font-semibold text-unisanta-navy">
              {countByCheckpoint.get(cp.id) ?? 0}
            </p>
            <p className="text-xs text-zinc-500">{cp.label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Aluno</th>
              <th className="px-4 py-3">Matrícula</th>
              <th className="px-4 py-3">Momento</th>
              <th className="px-4 py-3">Registrado em</th>
              <th className="px-4 py-3">Distância</th>
            </tr>
          </thead>
          <tbody>
            {(records ?? []).map((r) => {
              const checkpoint = checkpoints?.find((c) => c.id === r.checkpoint_id);
              const student = Array.isArray(r.students) ? r.students[0] : r.students;
              return (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-800">{student?.full_name}</td>
                  <td className="px-4 py-3 text-zinc-500">{student?.matricula}</td>
                  <td className="px-4 py-3 text-zinc-500">{checkpoint?.label}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(r.recorded_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{Math.round(r.distance_m)} m</td>
                </tr>
              );
            })}
            {(!records || records.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  Nenhum registro de presença ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
