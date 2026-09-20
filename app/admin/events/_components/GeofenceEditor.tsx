"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createGeofencePreset } from "../actions";
import { MIN_GEOFENCE_POINTS, polygonAreaSquareMeters, validateGeofenceArea } from "@/lib/geo/polygon";

const GeofenceMap = dynamic(() => import("@/components/GeofenceMap").then((m) => m.GeofenceMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-xl bg-zinc-100 text-sm text-zinc-400">
      Carregando mapa...
    </div>
  ),
});

type GeoPoint = { lat: number; lng: number };
type GeofencePreset = { id: string; nome: string; pontos: GeoPoint[] };

/** Assinatura de um conjunto de pontos, para achar o local salvo que corresponde aos pontos atuais (independente da ordem em que foram marcados). */
function pointsSignature(points: GeoPoint[]): string {
  return points
    .map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`)
    .sort()
    .join("|");
}

/**
 * Editor de área compartilhado entre a criação de evento (área opcional) e a
 * edição de um evento existente (área obrigatória — é a única finalidade da
 * tela). Controlado: quem usa guarda `points` e decide o que fazer com eles
 * (aqui, sempre serializados num input escondido `name`, pronto para um
 * `<form action={...}>` ao redor).
 */
export function GeofenceEditor({
  name = "geofencePoints",
  points,
  onChange,
  presets,
  required = false,
}: {
  name?: string;
  points: GeoPoint[];
  onChange: (next: GeoPoint[]) => void;
  presets: GeofencePreset[];
  required?: boolean;
}) {
  const router = useRouter();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetError, setPresetError] = useState<string | null>(null);
  const [presetSaved, setPresetSaved] = useState(false);
  const [isSavingPreset, startSavingPreset] = useTransition();

  const geofenceError = validateGeofenceArea(points, required);
  const areaM2 = points.length >= MIN_GEOFENCE_POINTS ? polygonAreaSquareMeters(points) : 0;
  const canSavePreset = points.length >= MIN_GEOFENCE_POINTS && !geofenceError;
  // Se os pontos atuais batem com um local salvo (por já ter sido aplicado, ou
  // por já terem vindo assim do evento), o combobox mostra esse local marcado.
  const selectedPresetId =
    points.length > 0
      ? (presets.find((preset) => pointsSignature(preset.pontos) === pointsSignature(points))?.id ??
        "")
      : "";

  function addPoint(point: GeoPoint) {
    onChange([...points, point]);
  }

  function updatePoint(index: number, key: "lat" | "lng", value: number) {
    onChange(points.map((p, i) => (i === index ? { ...p, [key]: value } : p)));
  }

  function removePoint(index: number) {
    onChange(points.filter((_, i) => i !== index));
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
        addPoint({ lat: position.coords.latitude, lng: position.coords.longitude });
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

  function applyPreset(presetId: string) {
    const preset = presets.find((p) => p.id === presetId);
    if (preset) onChange(preset.pontos);
  }

  function handleSavePreset() {
    setPresetError(null);
    setPresetSaved(false);
    startSavingPreset(async () => {
      const result = await createGeofencePreset(presetName, points);
      if (result.error) {
        setPresetError(result.error);
        return;
      }
      setPresetName("");
      setPresetSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-medium text-zinc-800">
          Área do evento
          {required && (
            <span className="ml-0.5 text-unisanta-red" aria-hidden="true">
              *
            </span>
          )}
        </h2>
        <p className="text-xs text-zinc-500">
          {required
            ? `Marque no mínimo ${MIN_GEOFENCE_POINTS} pontos no local (ex: os cantos da sala): vá até cada um e clique em "Adicionar ponto com minha localização", ou clique direto no mapa.`
            : `Opcional agora — dá para adiantar o cadastro sem a área e marcar os pontos depois, presencialmente. Quando marcar, use no mínimo ${MIN_GEOFENCE_POINTS} pontos (ex: os cantos da sala).`}
          {" "}Eles formam a área dentro da qual o check-in é aceito.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Reaproveitar local salvo</Label>
        <select
          value={selectedPresetId}
          onChange={(e) => {
            if (e.target.value) applyPreset(e.target.value);
          }}
          disabled={presets.length === 0}
          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-unisanta-navy focus:ring-2 focus:ring-unisanta-navy/15 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
        >
          <option value="">
            {presets.length > 0 ? "Selecione um local..." : "Nenhum local salvo ainda"}
          </option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.nome}
            </option>
          ))}
        </select>
      </div>

      <GeofenceMap
        points={points}
        onPointDrag={(index, lat, lng) =>
          onChange(points.map((p, i) => (i === index ? { lat, lng } : p)))
        }
        onMapClick={(lat, lng) => addPoint({ lat, lng })}
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
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-unisanta-navy/40 py-2.5 text-sm font-medium text-unisanta-navy transition-colors hover:bg-unisanta-navy/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Adicionar ponto com minha localização
      </button>

      {locationError && <p className="text-xs text-unisanta-red">{locationError}</p>}
      {geofenceError ? (
        <p className="text-xs text-amber-600">{geofenceError}</p>
      ) : points.length > 0 ? (
        <p className="text-xs text-emerald-700">
          Área definida — aproximadamente {Math.round(areaM2).toLocaleString("pt-BR")} m².
        </p>
      ) : null}

      {canSavePreset && (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-zinc-200 p-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Salvar esta área como local (ex: Sala 420A)</Label>
            <Input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Nome do local"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleSavePreset}
            loading={isSavingPreset}
            disabled={!presetName.trim()}
            className="sm:w-fit"
          >
            <Save className="h-4 w-4" />
            Salvar local
          </Button>
        </div>
      )}
      {presetError && <p className="text-xs text-unisanta-red">{presetError}</p>}
      {presetSaved && <p className="text-xs text-emerald-700">Local salvo com sucesso.</p>}

      <input type="hidden" name={name} value={JSON.stringify(points)} readOnly />
    </div>
  );
}
