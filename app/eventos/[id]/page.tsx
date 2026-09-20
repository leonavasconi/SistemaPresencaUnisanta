import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MapPin, Clock, QrCode } from "lucide-react";
import { ParticipantHeader } from "@/components/ParticipantHeader";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui/Card";
import { formatDateTimeBR, formatTimeBR } from "@/lib/datetime";
import { isUsableGeofence, parseGeofencePoints } from "@/lib/geo/polygon";

function momentoStatus(opensAt: string, closesAt: string, hasLocation: boolean) {
  // Sem local definido, o check-in sempre seria recusado no servidor ("área
  // não configurada") — melhor nem deixar o participante começar o fluxo.
  if (!hasLocation) {
    return { label: "Aguardando local definido", className: "bg-amber-100 text-amber-700", isOpen: false };
  }
  const now = Date.now();
  const opens = new Date(opensAt).getTime();
  const closes = new Date(closesAt).getTime();
  if (now < opens) return { label: "Em breve", className: "bg-zinc-100 text-zinc-500", isOpen: false };
  if (now > closes) return { label: "Encerrado", className: "bg-zinc-100 text-zinc-400", isOpen: false };
  return { label: "Aberto agora", className: "bg-emerald-100 text-emerald-700", isOpen: true };
}

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: event } = await supabase
    .from("eventos")
    .select("id, nome, descricao, inicio_em, fim_em, pontos_geofence, momentos_presenca(id, rotulo, abre_em, fecha_em, ordem, token_qr)")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) notFound();

  const momentos = [...(event.momentos_presenca ?? [])].sort((a, b) => a.ordem - b.ordem);
  const hasLocation = isUsableGeofence(parseGeofencePoints(event.pontos_geofence));

  const { data: myRecords } = await supabase
    .from("registros_presenca")
    .select("momento_id")
    .eq("participante_id", user?.id ?? "");
  const registeredMomentoIds = new Set((myRecords ?? []).map((r) => r.momento_id));

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <ParticipantHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
        <PageHeader title={event.nome} />

        <Card className="flex flex-col gap-3 p-5">
          <div>
            {event.descricao && <p className="text-sm text-zinc-500">{event.descricao}</p>}
            <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
              <MapPin className="h-3.5 w-3.5" />
              {formatDateTimeBR(new Date(event.inicio_em))} —{" "}
              {formatDateTimeBR(new Date(event.fim_em))}
            </p>
          </div>

          {momentos.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3">
              {momentos.map((momento) => {
                const status = momentoStatus(momento.abre_em, momento.fecha_em, hasLocation);
                const alreadyRegistered = registeredMomentoIds.has(momento.id);
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
                      {alreadyRegistered ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Presença já registrada
                        </span>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="border-t border-zinc-100 pt-3 text-center text-sm text-zinc-400">
              Nenhum momento de presença definido ainda.
            </p>
          )}
        </Card>

        <p className="text-center text-xs text-zinc-400">
          Registre presença lendo o QR Code exibido no local, ou pelo botão acima quando o
          momento estiver aberto.
        </p>
      </main>
    </div>
  );
}
