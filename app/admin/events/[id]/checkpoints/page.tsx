import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { addCheckpoint, deleteCheckpoint } from "../../actions";

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
    .from("events")
    .select("id, name")
    .eq("id", eventId)
    .maybeSingle();

  const { data: checkpoints } = await supabase
    .from("event_checkpoints")
    .select("id, label, opens_at, closes_at, order_index, qr_token")
    .eq("event_id", eventId)
    .order("order_index", { ascending: true });

  const checkpointsWithQr = await Promise.all(
    (checkpoints ?? []).map(async (cp) => ({
      ...cp,
      checkinUrl: `${origin}/checkin/${cp.qr_token}`,
      qrDataUrl: await QRCode.toDataURL(`${origin}/checkin/${cp.qr_token}`, { margin: 1, width: 220 }),
    })),
  );

  const addCheckpointWithEvent = addCheckpoint.bind(null, eventId);
  const nextOrderIndex = (checkpoints?.length ?? 0) + 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-unisanta-navy">
          Momentos de presença — {event?.name}
        </h1>
        <Link href={`/admin/events/${eventId}`} className="text-sm font-medium text-unisanta-navy hover:underline">
          Ver painel de presença →
        </Link>
      </div>

      <p className="max-w-2xl text-sm text-zinc-500">
        Adicione quantos momentos de registro quiser para este evento — por exemplo,
        apenas no encerramento, ou no início e no final, ou início, meio e final. Cada
        momento tem sua própria janela de horário e gera um QR Code exclusivo, que deve
        ser exibido/projetado no evento naquele instante.
      </p>

      <form
        action={addCheckpointWithEvent}
        className="flex max-w-xl flex-col gap-3 rounded-xl bg-white p-5 ring-1 ring-zinc-100"
      >
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-unisanta-red">{error}</p>
        )}
        <input type="hidden" name="orderIndex" value={nextOrderIndex} readOnly />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">Rótulo</label>
          <input
            name="label"
            required
            placeholder="Ex: Entrada, Meio da palestra, Encerramento..."
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700">Abre em</label>
            <input name="opensAt" type="datetime-local" required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700">Fecha em</label>
            <input name="closesAt" type="datetime-local" required className={inputClass} />
          </div>
        </div>
        <button
          type="submit"
          className="h-10 rounded-lg bg-unisanta-red font-medium text-white transition-colors hover:bg-unisanta-red-dark"
        >
          + Adicionar momento
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {checkpointsWithQr.map((cp) => (
          <div key={cp.id} className="flex flex-col items-center gap-3 rounded-xl bg-white p-5 text-center ring-1 ring-zinc-100">
            <h2 className="font-semibold text-zinc-800">{cp.label}</h2>
            <p className="text-xs text-zinc-500">
              {new Date(cp.opens_at).toLocaleString("pt-BR")} até{" "}
              {new Date(cp.closes_at).toLocaleString("pt-BR")}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cp.qrDataUrl} alt={`QR do momento ${cp.label}`} width={180} height={180} />
            <form action={deleteCheckpoint.bind(null, eventId, cp.id)}>
              <button type="submit" className="text-xs text-unisanta-red hover:underline">
                Remover momento
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-unisanta-navy focus:ring-1 focus:ring-unisanta-navy";
