"use client";

import { useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { createEvent } from "../actions";
import { Card } from "@/components/ui/Card";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CheckpointsEditor } from "../_components/CheckpointsEditor";
import { EventSchedule } from "../_components/EventSchedule";
import { GeofenceEditor } from "../_components/GeofenceEditor";
import { computeDefaultCheckpoints, validateCheckpointsSchedule, type CheckpointDraft } from "@/lib/checkpoints";
import { validateGeofenceArea } from "@/lib/geo/polygon";

type GeoPoint = { lat: number; lng: number };
type GeofencePreset = { id: string; nome: string; pontos: GeoPoint[] };

export function NewEventForm({ error, presets }: { error?: string; presets: GeofencePreset[] }) {
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [checkpoints, setCheckpoints] = useState<CheckpointDraft[]>([]);
  // Enquanto o usuário não mexer manualmente nos momentos, os horários exibidos
  // são derivados do início/fim do evento a cada render, em vez de guardados.
  const [checkpointsTouched, setCheckpointsTouched] = useState(false);
  const visibleCheckpoints = checkpointsTouched
    ? checkpoints
    : computeDefaultCheckpoints(startsAt, endsAt);
  const checkpointsError = validateCheckpointsSchedule(visibleCheckpoints, startsAt, endsAt);

  // Mesma validação que o servidor aplica, para o erro aparecer antes do envio.
  // A área é opcional na criação — pode ficar em branco e ser definida depois.
  const geofenceError = validateGeofenceArea(points, false);

  return (
    <form action={createEvent} className="flex flex-col gap-6">
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-unisanta-red">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="font-medium text-zinc-800">Dados do evento</h2>

          <div className="flex flex-col gap-1.5">
            <Label required>Nome do evento</Label>
            <Input name="name" required placeholder="Ex: Semana Acadêmica 2026" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Descrição (opcional)</Label>
            <Textarea name="description" />
          </div>

          <EventSchedule
            startsAt={startsAt}
            endsAt={endsAt}
            onChange={(inicio, fim) => {
              setStartsAt(inicio);
              setEndsAt(fim);
            }}
          />
        </Card>

        <Card className="flex flex-col gap-3 p-6">
          <GeofenceEditor points={points} onChange={setPoints} presets={presets} required={false} />
        </Card>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-medium text-zinc-800">
              Momentos de presença<span className="ml-0.5 text-unisanta-red" aria-hidden="true">*</span>
            </h2>
            <p className="text-xs text-zinc-500">
              Cada momento gera um QR próprio para o check-in. Já sugerimos 3 horários
              (início, meio e fim do evento) — edite os horários, remova ou adicione outros
              conforme a necessidade.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCheckpointsTouched(false)}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-unisanta-navy/40 hover:text-unisanta-navy"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sugerir horários a partir do início/fim
          </button>
        </div>

        <CheckpointsEditor
          value={visibleCheckpoints}
          onChange={(next) => {
            setCheckpointsTouched(true);
            setCheckpoints(next);
          }}
        />
        {checkpointsError && <p className="text-xs text-unisanta-red">{checkpointsError}</p>}
      </Card>

      <Button
        type="submit"
        className="w-full sm:w-fit sm:self-end"
        disabled={Boolean(geofenceError) || Boolean(checkpointsError)}
      >
        Criar evento
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}

