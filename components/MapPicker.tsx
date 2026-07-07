"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Corrige os ícones padrão do Leaflet, que não são resolvidos automaticamente
// pelo bundler do Next.js.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const SANTOS_COORDS: [number, number] = [-23.9608, -46.3336];

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapPicker({
  latitude,
  longitude,
  radiusMeters,
  onChange,
}: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const [position, setPosition] = useState<[number, number]>(
    latitude && longitude ? [latitude, longitude] : SANTOS_COORDS,
  );

  function handlePick(lat: number, lng: number) {
    setPosition([lat, lng]);
    onChange(lat, lng);
  }

  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-zinc-200">
      <MapContainer
        center={position}
        zoom={16}
        style={{ height: "280px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={position}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const { lat, lng } = marker.getLatLng();
              handlePick(lat, lng);
            },
          }}
        />
        <Circle center={position} radius={radiusMeters} pathOptions={{ color: "#da251c" }} />
        <ClickHandler onPick={handlePick} />
      </MapContainer>
      <p className="bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
        Clique no mapa ou arraste o marcador para definir o local do evento.
      </p>
    </div>
  );
}
