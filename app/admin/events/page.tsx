import Link from "next/link";
import { Plus, Calendar, ArrowRight, CalendarX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, name, starts_at, ends_at")
    .order("starts_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Eventos"
        subtitle="Crie e gerencie os eventos e seus momentos de presença"
        action={
          <Link href="/admin/events/new">
            <Button>
              <Plus className="h-4 w-4" />
              Novo evento
            </Button>
          </Link>
        }
      />

      {!events || events.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <CalendarX className="h-8 w-8 text-zinc-300" />
          <p className="text-sm text-zinc-500">Nenhum evento cadastrado ainda.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link key={event.id} href={`/admin/events/${event.id}`}>
              <Card className="flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-zinc-800">{event.name}</h2>
                  <Calendar className="h-4 w-4 shrink-0 text-unisanta-navy" />
                </div>
                <div className="mt-auto flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    {new Date(event.starts_at).toLocaleDateString("pt-BR")}
                    {" · "}
                    {new Date(event.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-unisanta-navy">
                    Ver painel
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
