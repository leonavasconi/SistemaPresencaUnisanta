"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Plus, Trash2, Loader2, RefreshCw } from "lucide-react";
import { createEvent } from "../actions";
import { Card } from "@/components/ui/Card";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CheckpointsEditor } from "../_components/CheckpointsEditor";
import { computeDefaultCheckpoints, validateCheckpointsSchedule, type CheckpointDraft } from "@/lib/checkpoints";

const GeofenceMap = dynamic(() => import("@/components/GeofenceMap").then((m) => m.GeofenceMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-xl bg-zinc-100 text-sm text-zinc-400">
      Carregando mapa...
    </div>
  ),
});

type GeoPoint = { lat: number; lng: number };

export function NewEventForm({ error }: { error?: string }) {
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<CheckpointDraft[]>([]);
  // Enquanto o usuário não mexer manualmente nos momentos, os horários exibidos
  // são derivados do início/fim do evento a cada render, em vez de guardados.
  const [checkpointsTouched, setCheckpointsTouched] = useState(false);
  const visibleCheckpoints = checkpointsTouched
    ? checkpoints
    : computeDefaultCheckpoints(startsAt, endsAt);
  const checkpointsError = validateCheckpointsSchedule(visibleCheckpoints, startsAt, endsAt);

  function updatePoint(index: number, key: "lat" | "lng", value: number) {
    setPoints((prev) => prev.map((p, i) => (i === index ? { ...p, [key]: value } : p)));
  }

  function removePoint(index: number) {
    setPoints((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddPointFromLocation() {
    setLocationError(null);
    if (!("geolocation" in navigator)) {
      setLocationError("Seu navegador não suporta geolocalização.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPoints((prev) => [
          ...prev,
          { lat: position.coords.latitude, lng: position.coords.longitude },
        ]);
        setLocating(false);
      },
      () => {
        setLocationError(
          "Não foi possível obter sua localização. Verifique a permissão do navegador.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label required>Início</Label>
              <Input
                name="startsAt"
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label required>Fim</Label>
              <Input
                name="endsAt"
                type="datetime-local"
                required
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-6">
          <div>
            <h2 className="font-medium text-zinc-800">
              Área do evento<span className="ml-0.5 text-unisanta-red" aria-hidden="true">*</span>
            </h2>
            <p className="text-xs text-zinc-500">
              Vá até cada canto do local (ex: os 4 cantos de uma sala) e clique em
              &quot;Adicionar ponto com minha localização&quot;. Os pontos são ligados em ordem,
              formando o contorno da área liberada para o check-in.
            </p>
          </div>

          <GeofenceMap
            points={points}
            onPointDrag={(index, lat, lng) =>
              setPoints((prev) => prev.map((p, i) => (i === index ? { lat, lng } : p)))
            }
            onMapClick={(lat, lng) => setPoints((prev) => [...prev, { lat, lng }])}
          />

          {points.length > 0 && (
            <div className="flex flex-col gap-2">
              {points.map((point, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-unisanta-navy/10 text-xs font-semibold text-unisanta-navy">
                    {index + 1}
                  </span>
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <Input
                      type="number"
                      step="any"
                      value={point.lat}
                      onChange={(e) => updatePoint(index, "lat", Number(e.target.value))}
                      aria-label={`Latitude do ponto ${index + 1}`}
                    />
                    <Input
                      type="number"
                      step="any"
                      value={point.lng}
                      onChange={(e) => updatePoint(index, "lng", Number(e.target.value))}
                      aria-label={`Longitude do ponto ${index + 1}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePoint(index)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-unisanta-red"
                    aria-label={`Remover ponto ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleAddPointFromLocation}
            disabled={locating}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-unisanta-navy/40 py-2.5 text-sm font-medium text-unisanta-navy transition-colors hover:bg-unisanta-navy/5 disabled:opacity-50"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar ponto com minha localização
          </button>

          {locationError && <p className="text-xs text-unisanta-red">{locationError}</p>}
          {points.length > 0 && points.length < 3 && (
            <p className="text-xs text-amber-600">
              Adicione pelo menos 3 pontos para formar uma área fechada.
            </p>
          )}
        </Card>
      </div>

      <input type="hidden" name="geofencePoints" value={JSON.stringify(points)} readOnly />

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-medium text-zinc-800">
              Momentos de presença<span className="ml-0.5 text-unisanta-red" aria-hidden="true">*</span>
            </h2>
            <p className="text-xs text-zinc-500">
              Cada momento gera um QR próprio para o check-in. Já sugerimos início, meio e
              encerramento — edite os horários, remova ou adicione outros conforme a necessidade.
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
        disabled={points.length < 3 || Boolean(checkpointsError)}
      >
        Criar evento
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
