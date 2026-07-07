import { CalendarX2, CheckCircle2 } from "lucide-react";
import { StudentHeader } from "@/components/StudentHeader";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui/Card";

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
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
        <PageHeader title="Minhas presenças" subtitle="Histórico de registros em eventos" />

        {!records || records.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <CalendarX2 className="h-8 w-8 text-zinc-300" />
            <p className="text-sm text-zinc-500">
              Você ainda não registrou presença em nenhum evento.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {records.map((r) => {
              const checkpoint = Array.isArray(r.event_checkpoints)
                ? r.event_checkpoints[0]
                : r.event_checkpoints;
              const event = Array.isArray(checkpoint?.events)
                ? checkpoint?.events[0]
                : checkpoint?.events;
              return (
                <Card key={r.id} className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-zinc-800">{event?.name}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(r.recorded_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <span className="rounded-full bg-unisanta-navy/10 px-2.5 py-1 text-xs font-medium text-unisanta-navy">
                    {checkpoint?.label}
                  </span>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
