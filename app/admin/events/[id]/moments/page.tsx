import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { syncCheckpoints } from "../../actions";
import { computeDefaultCheckpoints, type CheckpointDraft } from "@/lib/checkpoints";
import { toDatetimeLocalValue } from "@/lib/datetime";
import { PageHeader, Card } from "@/components/ui/Card";
import { CheckpointsManager } from "./CheckpointsManager";

export default async function CheckpointsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id: eventId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const headerList = await headers();
  const origin = `${headerList.get("x-forwarded-proto") ?? "http"}://${headerList.get("host")}`;

  const { data: event } = await supabase
    .from("eventos")
    .select("id, nome, inicio_em, fim_em")
    .eq("id", eventId)
    .maybeSingle();

  const { data: checkpoints } = await supabase
    .from("momentos_presenca")
    .select("id, rotulo, abre_em, fecha_em, ordem, token_qr")
    .eq("evento_id", eventId)
    .order("ordem", { ascending: true });

  const qrByCheckpointId: Record<string, { qrDataUrl: string }> = {};
  for (const cp of checkpoints ?? []) {
    qrByCheckpointId[cp.id] = {
      qrDataUrl: await QRCode.toDataURL(`${origin}/presenca/${cp.token_qr}`, { margin: 1, width: 220 }),
    };
  }

  const initialCheckpoints: CheckpointDraft[] =
    checkpoints && checkpoints.length > 0
      ? checkpoints.map((cp) => ({
          id: cp.id,
          opensAt: toDatetimeLocalValue(new Date(cp.abre_em)),
          closesAt: toDatetimeLocalValue(new Date(cp.fecha_em)),
        }))
      : computeDefaultCheckpoints(
          event ? toDatetimeLocalValue(new Date(event.inicio_em)) : "",
          event ? toDatetimeLocalValue(new Date(event.fim_em)) : "",
        );

  const syncCheckpointsForEvent = syncCheckpoints.bind(
    null,
    eventId,
    `/admin/events/${eventId}/moments`,
  );
  const eventStartsAt = event ? toDatetimeLocalValue(new Date(event.inicio_em)) : "";
  const eventEndsAt = event ? toDatetimeLocalValue(new Date(event.fim_em)) : "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Momentos de presença`}
        subtitle={event?.nome}
        action={
          <Link
            href={`/admin/events/${eventId}`}
            className="flex items-center gap-1 text-sm font-medium text-unisanta-navy hover:underline"
          >
            Ver painel de presença
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {error && (
        <p className="max-w-2xl rounded-xl bg-red-50 px-3 py-2 text-sm text-unisanta-red">{error}</p>
      )}

      <Card className="flex flex-col gap-4 p-6">
        <CheckpointsManager
          title="Quando a presença deve ser registrada?"
          description="Ajuste o horário de cada momento, remova o que não for usar ou adicione outros abaixo. Cada momento tem seu próprio QR Code para o check-in."
          initialCheckpoints={initialCheckpoints}
          eventStartsAt={eventStartsAt}
          eventEndsAt={eventEndsAt}
          qrByCheckpointId={qrByCheckpointId}
          action={syncCheckpointsForEvent}
        />
      </Card>
    </div>
  );
}

