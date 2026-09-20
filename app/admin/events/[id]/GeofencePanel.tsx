"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GeofenceEditor } from "../_components/GeofenceEditor";
import { validateGeofenceArea } from "@/lib/geo/polygon";

type GeoPoint = { lat: number; lng: number };
type GeofencePreset = { id: string; nome: string; pontos: GeoPoint[] };

/**
 * Card do painel do evento para definir (ou corrigir) a área de check-in.
 * Sempre visível — tanto para eventos criados sem posição ainda (fluxo
 * "adianto o cadastro e marco os pontos presencialmente depois") quanto para
 * ajustar uma área já definida.
 *
 * Chama a Server Action diretamente (não via `<form action={...}>`) e usa
 * `router.refresh()` no final — um `<form>` nativo aqui reseta o estado do
 * `GeofenceEditor` (ex: o combobox de local reaproveitado volta a "Selecione
 * um local...") porque a navegação embutida do form substitui a árvore
 * inteira, em vez de só atualizar os dados como o `router.refresh()` faz.
 */
export function GeofencePanel({
  initialPoints,
  presets,
  action,
}: {
  initialPoints: GeoPoint[];
  presets: GeofencePreset[];
  action: (points: GeoPoint[]) => Promise<{ error: string | null }>;
}) {
  const router = useRouter();
  const [points, setPoints] = useState<GeoPoint[]>(initialPoints);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const geofenceError = validateGeofenceArea(points, true);

  function handlePointsChange(next: GeoPoint[]) {
    // O erro (ex: conflito de horário/local) vale para os pontos que estavam
    // salvos quando ele apareceu — mexer nos pontos de novo o invalida.
    setError(null);
    setPoints(next);
  }

  function handleSave() {
    setError(null);
    startSaving(async () => {
      const result = await action(points);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-3">
        <GeofenceEditor points={points} onChange={handlePointsChange} presets={presets} required />
        {error && <p className="text-xs text-unisanta-red">{error}</p>}
        <Button
          type="button"
          onClick={handleSave}
          loading={isSaving}
          className="w-full sm:w-fit sm:self-end"
          disabled={Boolean(geofenceError)}
        >
          <Save className="h-4 w-4" />
          Salvar área
        </Button>
      </div>
    </Card>
  );
}

