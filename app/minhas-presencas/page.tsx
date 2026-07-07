import { StudentHeader } from "@/components/StudentHeader";
import { createClient } from "@/lib/supabase/server";

export default async function MinhasPresencasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: records } = await supabase
    .from("attendance_records")
    .select("id, recorded_at, event_checkpoints(label, events(name))")
    .eq("student_id", user?.id ?? "")
    .order("recorded_at", { ascending: false });

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <StudentHeader />
      <main className="flex flex-1 flex-col gap-4 px-6 py-8">
        <h1 className="text-xl font-semibold text-unisanta-navy">Minhas presenças</h1>

        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-100">
          {!records || records.length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-500">
              Você ainda não registrou presença em nenhum evento.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3">Momento</th>
                  <th className="px-4 py-3">Registrado em</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const checkpoint = Array.isArray(r.event_checkpoints)
                    ? r.event_checkpoints[0]
                    : r.event_checkpoints;
                  const event = Array.isArray(checkpoint?.events)
                    ? checkpoint?.events[0]
                    : checkpoint?.events;
                  return (
                    <tr key={r.id} className="border-t border-zinc-100">
                      <td className="px-4 py-3 font-medium text-zinc-800">{event?.name}</td>
                      <td className="px-4 py-3 text-zinc-500">{checkpoint?.label}</td>
                      <td className="px-4 py-3 text-zinc-500">
                        {new Date(r.recorded_at).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
