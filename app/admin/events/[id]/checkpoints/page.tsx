import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { addCheckpoint, applyCheckpointPreset, deleteCheckpoint, updateCheckpoint } from "../../actions";
import { CHECKPOINT_PRESETS } from "@/lib/checkpointPresets";
import { toDatetimeLocalValue } from "@/lib/datetime";

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
  const applyPresetWithEvent = applyCheckpointPreset.bind(null, eventId);
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

      {error && (
        <p className="max-w-2xl rounded-lg bg-red-50 px-3 py-2 text-sm text-unisanta-red">{error}</p>
      )}

      <div className="flex flex-col gap-3 rounded-xl bg-white p-5 ring-1 ring-zinc-100">
        <div>
          <h2 className="font-medium text-zinc-800">Quando a presença deve ser registrada?</h2>
          <p className="text-sm text-zinc-500">
            Escolha um modelo para criar os momentos automaticamente com horários sugeridos —
            você pode editar o rótulo e o horário de cada um (ou remover e adicionar outros) depois.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CHECKPOINT_PRESETS.map((preset) => (
            <form key={preset.key} action={applyPresetWithEvent}>
              <input type="hidden" name="preset" value={preset.key} />
              <button
                type="submit"
                className="flex h-full w-full flex-col gap-1 rounded-lg border border-zinc-200 p-4 text-left transition-colors hover:border-unisanta-navy hover:bg-unisanta-navy/5"
              >
                <span className="font-medium text-unisanta-navy">{preset.title}</span>
                <span className="text-xs text-zinc-500">{preset.description}</span>
              </button>
            </form>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {checkpointsWithQr.map((cp) => (
          <div key={cp.id} className="flex flex-col gap-4 rounded-xl bg-white p-5 ring-1 ring-zinc-100 sm:flex-row">
            <form
              action={updateCheckpoint.bind(null, eventId, cp.id)}
              className="flex flex-1 flex-col gap-3"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">Rótulo</label>
                <input name="label" defaultValue={cp.label} required className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-500">Abre em</label>
                  <input
                    name="opensAt"
                    type="datetime-local"
                    required
                    defaultValue={toDatetimeLocalValue(new Date(cp.opens_at))}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-500">Fecha em</label>
                  <input
                    name="closesAt"
                    type="datetime-local"
                    required
                    defaultValue={toDatetimeLocalValue(new Date(cp.closes_at))}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="h-9 flex-1 rounded-lg bg-unisanta-navy text-sm font-medium text-white transition-colors hover:bg-unisanta-navy-dark"
                >
                  Salvar alterações
                </button>
              </div>
            </form>

            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cp.qrDataUrl} alt={`QR do momento ${cp.label}`} width={140} height={140} />
              <form action={deleteCheckpoint.bind(null, eventId, cp.id)}>
                <button type="submit" className="text-xs text-unisanta-red hover:underline">
                  Remover momento
                </button>
              </form>
            </div>
          </div>
        ))}

        {checkpointsWithQr.length === 0 && (
          <p className="col-span-full rounded-xl bg-white p-6 text-center text-sm text-zinc-500 ring-1 ring-zinc-100">
            Nenhum momento criado ainda — escolha um modelo acima ou adicione um personalizado abaixo.
          </p>
        )}
      </div>

      <details className="max-w-xl rounded-xl bg-white ring-1 ring-zinc-100">
        <summary className="cursor-pointer select-none px-5 py-4 font-medium text-zinc-700">
          + Adicionar momento personalizado
        </summary>
        <form action={addCheckpointWithEvent} className="flex flex-col gap-3 px-5 pb-5">
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
      </details>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-unisanta-navy focus:ring-1 focus:ring-unisanta-navy";
