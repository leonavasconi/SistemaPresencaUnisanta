"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { createEvent } from "../actions";

const MapPicker = dynamic(() => import("@/components/MapPicker").then((m) => m.MapPicker), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-400">
      Carregando mapa...
    </div>
  ),
});

const inputClass =
  "h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-unisanta-navy focus:ring-1 focus:ring-unisanta-navy";

export function NewEventForm({ error }: { error?: string }) {
  const [latitude, setLatitude] = useState(-23.9608);
  const [longitude, setLongitude] = useState(-46.3336);
  const [radiusMeters, setRadiusMeters] = useState(100);

  return (
    <form action={createEvent} className="flex max-w-xl flex-col gap-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-unisanta-red">{error}</p>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">Nome do evento</label>
        <input name="name" required className={inputClass} placeholder="Ex: Semana Acadêmica 2026" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">Descrição (opcional)</label>
        <textarea name="description" className={`${inputClass} h-20 py-2`} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">Início</label>
          <input name="startsAt" type="datetime-local" required className={inputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">Fim</label>
          <input name="endsAt" type="datetime-local" required className={inputClass} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-700">Local do evento</label>
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
            className="h-9 w-24 rounded-lg border border-zinc-200 px-2 text-sm"
          />
        </div>
      </div>

      <input type="hidden" name="latitude" value={latitude} readOnly />
      <input type="hidden" name="longitude" value={longitude} readOnly />
      <input type="hidden" name="radiusMeters" value={radiusMeters} readOnly />

      <button
        type="submit"
        className="h-11 w-full rounded-lg bg-unisanta-red font-medium text-white transition-colors hover:bg-unisanta-red-dark"
      >
        Criar evento e definir momentos de presença
      </button>
    </form>
  );
}
