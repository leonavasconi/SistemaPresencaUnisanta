"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input, Label } from "@/components/ui/Input";
import { checkpointLabel, sortCheckpointsByTime, type CheckpointDraft } from "@/lib/checkpoints";

/**
 * Lista editável de momentos de presença (abre/fecha em), usada tanto na criação do evento
 * (estado local, sem `id`) quanto no gerenciamento de um evento já existente (com `id`,
 * persistido via `syncCheckpoints`). O componente é controlado: quem o usa guarda o estado
 * e decide o que fazer com ele (serializar num input escondido, enviar ao servidor). Não há
 * rótulo editável — o número exibido reflete a ordem cronológica (1 = mais cedo).
 */
export function CheckpointsEditor({
  name = "checkpoints",
  value,
  onChange,
  qrByCheckpointId,
}: {
  name?: string;
  value: CheckpointDraft[];
  onChange: (next: CheckpointDraft[]) => void;
  qrByCheckpointId?: Record<string, { qrDataUrl: string }>;
}) {
  function update(index: number, patch: Partial<CheckpointDraft>) {
    onChange(value.map((cp, i) => (i === index ? { ...cp, ...patch } : cp)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...value, { opensAt: "", closesAt: "" }]);
  }

  const orderedByTime = sortCheckpointsByTime(
    value.map((checkpoint, index) => ({ ...checkpoint, index })),
  );

  return (
    <div className="flex flex-col gap-3">
      {orderedByTime.map((cp, position) => {
        const qr = cp.id ? qrByCheckpointId?.[cp.id] : undefined;
        return (
          <div
            key={cp.id ?? `novo-${cp.index}`}
            className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              {/* Número e nome numa etiqueta só. O nome vem da mesma função
                  que grava o rótulo no banco, então o que o organizador lê
                  aqui é o que aparece no QR, no painel e na exportação. */}
              <span className="flex min-w-0 items-center gap-2 rounded-lg bg-unisanta-navy/10 py-1.5 pl-2 pr-3 text-unisanta-navy">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-unisanta-navy/15 text-xs font-semibold">
                  {position + 1}
                </span>
                <span className="truncate text-sm font-medium">{checkpointLabel(position)}</span>
              </span>
              {qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qr.qrDataUrl}
                  alt={`QR do momento ${position + 1}`}
                  width={48}
                  height={48}
                  className="shrink-0 rounded-lg ring-1 ring-zinc-200"
                />
              )}
              <button
                type="button"
                onClick={() => remove(cp.index)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-unisanta-red"
                aria-label={`Remover momento ${position + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Abre em</Label>
                <Input
                  type="datetime-local"
                  value={cp.opensAt}
                  onChange={(e) => update(cp.index, { opensAt: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fecha em</Label>
                <Input
                  type="datetime-local"
                  value={cp.closesAt}
                  onChange={(e) => update(cp.index, { closesAt: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-unisanta-navy/40 py-2.5 text-sm font-medium text-unisanta-navy transition-colors hover:bg-unisanta-navy/5"
      >
        <Plus className="h-4 w-4" />
        Adicionar outro momento
      </button>

      {value.length === 0 && (
        <p className="text-xs text-amber-600">Adicione pelo menos um momento de presença.</p>
      )}

      <input type="hidden" name={name} value={JSON.stringify(value)} readOnly />
    </div>
  );
}

