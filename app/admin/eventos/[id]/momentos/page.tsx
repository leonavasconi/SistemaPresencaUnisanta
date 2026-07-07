import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowRight, Flag, LogIn, Clock3, Plus, Trash2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addCheckpoint, applyCheckpointPreset, deleteCheckpoint, updateCheckpoint } from "../../actions";
import { CHECKPOINT_PRESETS, type CheckpointPreset } from "@/lib/checkpointPresets";
import { toDatetimeLocalValue } from "@/lib/datetime";
import { PageHeader, Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const PRESET_ICONS: Record<CheckpointPreset, typeof Flag> = {
  encerramento: Flag,
  inicio_fim: LogIn,
  inicio_meio_fim: Clock3,
};

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
    .select("id, nome")
    .eq("id", eventId)
    .maybeSingle();

  const { data: checkpoints } = await supabase
    .from("momentos_presenca")
    .select("id, rotulo, abre_em, fecha_em, ordem, token_qr")
    .eq("evento_id", eventId)
    .order("ordem", { ascending: true });

  const checkpointsWithQr = await Promise.all(
    (checkpoints ?? []).map(async (cp) => ({
      ...cp,
      checkinUrl: `${origin}/presenca/${cp.token_qr}`,
      qrDataUrl: await QRCode.toDataURL(`${origin}/presenca/${cp.token_qr}`, { margin: 1, width: 220 }),
    })),
  );

  const addCheckpointWithEvent = addCheckpoint.bind(null, eventId);
  const applyPresetWithEvent = applyCheckpointPreset.bind(null, eventId);
  const nextOrderIndex = (checkpoints?.length ?? 0) + 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Momentos de presença`}
        subtitle={event?.nome}
        action={
          <Link
            href={`/admin/eventos/${eventId}`}
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
        <div>
          <h2 className="font-medium text-zinc-800">Quando a presença deve ser registrada?</h2>
          <p className="text-sm text-zinc-500">
            Escolha um modelo para criar os momentos automaticamente com horários sugeridos —
            você pode editar o rótulo e o horário de cada um (ou remover e adicionar outros) depois.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CHECKPOINT_PRESETS.map((preset) => {
            const Icon = PRESET_ICONS[preset.key];
            return (
              <form key={preset.key} action={applyPresetWithEvent}>
                <input type="hidden" name="preset" value={preset.key} />
                <button
                  type="submit"
                  className="group flex h-full w-full flex-col gap-2 rounded-xl border border-zinc-200 p-4 text-left transition-all hover:border-unisanta-navy hover:bg-unisanta-navy/5 hover:shadow-sm"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-unisanta-navy/10 text-unisanta-navy transition-colors group-hover:bg-unisanta-navy group-hover:text-white">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-medium text-unisanta-navy">{preset.title}</span>
                  <span className="text-xs text-zinc-500">{preset.description}</span>
                </button>
              </form>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {checkpointsWithQr.map((cp) => (
          <Card key={cp.id} className="flex flex-col gap-4 p-5 sm:flex-row">
            <form
              action={updateCheckpoint.bind(null, eventId, cp.id)}
              className="flex flex-1 flex-col gap-3"
            >
              <div className="flex flex-col gap-1.5">
                <Label>Rótulo</Label>
                <Input name="label" defaultValue={cp.rotulo} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Abre em</Label>
                  <Input
                    name="opensAt"
                    type="datetime-local"
                    required
                    defaultValue={toDatetimeLocalValue(new Date(cp.abre_em))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Fecha em</Label>
                  <Input
                    name="closesAt"
                    type="datetime-local"
                    required
                    defaultValue={toDatetimeLocalValue(new Date(cp.fecha_em))}
                  />
                </div>
              </div>
              <Button type="submit" variant="secondary" className="w-full">
                <Save className="h-4 w-4" />
                Salvar alterações
              </Button>
            </form>

            <div className="flex flex-col items-center gap-2 border-t border-zinc-100 pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cp.qrDataUrl} alt={`QR do momento ${cp.rotulo}`} width={140} height={140} className="rounded-lg" />
              <form action={deleteCheckpoint.bind(null, eventId, cp.id)}>
                <button type="submit" className="flex items-center gap-1 text-xs text-unisanta-red hover:underline">
                  <Trash2 className="h-3 w-3" />
                  Remover momento
                </button>
              </form>
            </div>
          </Card>
        ))}

        {checkpointsWithQr.length === 0 && (
          <Card className="col-span-full p-8 text-center text-sm text-zinc-500">
            Nenhum momento criado ainda — escolha um modelo acima ou adicione um personalizado abaixo.
          </Card>
        )}
      </div>

      <Card className="max-w-xl">
        <details className="group">
          <summary className="flex cursor-pointer select-none items-center gap-2 px-5 py-4 font-medium text-zinc-700">
            <Plus className="h-4 w-4 text-unisanta-navy" />
            Adicionar momento personalizado
          </summary>
          <form action={addCheckpointWithEvent} className="flex flex-col gap-3 px-5 pb-5">
            <input type="hidden" name="orderIndex" value={nextOrderIndex} readOnly />
            <div className="flex flex-col gap-1.5">
              <Label>Rótulo</Label>
              <Input
                name="label"
                required
                placeholder="Ex: Entrada, Meio da palestra, Encerramento..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Abre em</Label>
                <Input name="opensAt" type="datetime-local" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fecha em</Label>
                <Input name="closesAt" type="datetime-local" required />
              </div>
            </div>
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4" />
              Adicionar momento
            </Button>
          </form>
        </details>
      </Card>
    </div>
  );
}
