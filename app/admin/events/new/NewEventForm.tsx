"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { createEvent } from "../actions";
import { Card } from "@/components/ui/Card";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const MapPicker = dynamic(() => import("@/components/MapPicker").then((m) => m.MapPicker), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-xl bg-zinc-100 text-sm text-zinc-400">
      Carregando mapa...
    </div>
  ),
});

export function NewEventForm({ error }: { error?: string }) {
  const [latitude, setLatitude] = useState(-23.9608);
  const [longitude, setLongitude] = useState(-46.3336);
  const [radiusMeters, setRadiusMeters] = useState(100);

  return (
    <form action={createEvent} className="flex max-w-xl flex-col gap-5">
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-unisanta-red">{error}</p>
      )}

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1.5">
          <Label>Nome do evento</Label>
          <Input name="name" required placeholder="Ex: Semana Acadêmica 2026" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Descrição (opcional)</Label>
          <Textarea name="description" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Início</Label>
            <Input name="startsAt" type="datetime-local" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Fim</Label>
            <Input name="endsAt" type="datetime-local" required />
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-6">
        <Label>Local do evento</Label>
        <MapPicker
          latitude={latitude}
          longitude={longitude}
          radiusMeters={radiusMeters}
          onChange={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-600">Raio de tolerância (metros)</label>
          <input
            type="number"
            min={10}
            max={2000}
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(Number(e.target.value))}
            className="h-9 w-24 rounded-lg border border-zinc-200 px-2 text-sm outline-none focus:border-unisanta-navy focus:ring-2 focus:ring-unisanta-navy/15"
          />
        </div>
      </Card>

      <input type="hidden" name="latitude" value={latitude} readOnly />
      <input type="hidden" name="longitude" value={longitude} readOnly />
      <input type="hidden" name="radiusMeters" value={radiusMeters} readOnly />

      <Button type="submit" className="w-full">
        Criar evento e definir momentos de presença
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
