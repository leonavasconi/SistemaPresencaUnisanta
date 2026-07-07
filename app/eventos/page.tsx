import Link from "next/link";
import { CalendarX2, MapPin, Clock, QrCode } from "lucide-react";
import { StudentHeader } from "@/components/StudentHeader";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui/Card";
import { eventMatchesAudience } from "@/lib/audience";
import { formatDateTimeBR, formatTimeBR } from "@/lib/datetime";

function momentoStatus(opensAt: string, closesAt: string) {
  const now = Date.now();
  const opens = new Date(opensAt).getTime();
  const closes = new Date(closesAt).getTime();
  if (now < opens) return { label: "Em breve", className: "bg-zinc-100 text-zinc-500", isOpen: false };
  if (now > closes) return { label: "Encerrado", className: "bg-zinc-100 text-zinc-400", isOpen: false };
  return { label: "Aberto agora", className: "bg-emerald-100 text-emerald-700", isOpen: true };
}

export default async function EventosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("alunos")
    .select("curso, sala")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const { data: events } = await supabase
    .from("eventos")
    .select(
      "id, nome, descricao, inicio_em, fim_em, cursos_alvo, salas_alvo, momentos_presenca(id, rotulo, abre_em, fecha_em, ordem, token_qr)",
    )
    .order("inicio_em", { ascending: false });

  const visibleEvents = (events ?? []).filter((event) =>
    eventMatchesAudience(event, { curso: student?.curso, sala: student?.sala }),
  );

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <StudentHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
        <PageHeader title="Eventos" subtitle="Eventos disponíveis para você" />

        {visibleEvents.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <CalendarX2 className="h-8 w-8 text-zinc-300" />
            <p className="text-sm text-zinc-500">Nenhum evento disponível no momento.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {visibleEvents.map((event) => {
              const momentos = [...(event.momentos_presenca ?? [])].sort(
                (a, b) => a.ordem - b.ordem,
              );
              return (
                <Card key={event.id} className="flex flex-col gap-3 p-5">
                  <div>
                    <h2 className="font-semibold text-zinc-800">{event.nome}</h2>
                    {event.descricao && (
                      <p className="mt-0.5 text-sm text-zinc-500">{event.descricao}</p>
                    )}
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
                      <MapPin className="h-3.5 w-3.5" />
                      {formatDateTimeBR(new Date(event.inicio_em))} —{" "}
                      {formatDateTimeBR(new Date(event.fim_em))}
                    </p>
                  </div>

                  {momentos.length > 0 && (
                    <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3">
                      {momentos.map((momento) => {
                        const status = momentoStatus(momento.abre_em, momento.fecha_em);
                        return (
                          <div key={momento.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="flex items-center gap-1.5 text-zinc-600">
                              <Clock className="h-3.5 w-3.5 shrink-0 text-unisanta-navy" />
                              {momento.rotulo}
                              <span className="text-xs text-zinc-400">
                                ({formatTimeBR(new Date(momento.abre_em))}
                                {" – "}
                                {formatTimeBR(new Date(momento.fecha_em))})
                              </span>
                            </span>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                                {status.label}
                              </span>
                              {status.isOpen && (
                                <Link
                                  href={`/presenca/${momento.token_qr}`}
                                  className="flex items-center gap-1 rounded-full bg-unisanta-red px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-unisanta-red-dark"
                                >
                                  <QrCode className="h-3 w-3" />
                                  Registrar presença
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-zinc-400">
          Registre presença lendo o QR Code exibido no local, ou pelo botão acima quando o
          momento estiver aberto.
        </p>
      </main>
    </div>
  );
}
