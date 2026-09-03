"use client";

import { MapContainer, TileLayer, Marker, Polygon, Polyline, Tooltip, useMapEvents } from "react-leaflet";
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

export function GeofenceMap({
  points,
  onPointDrag,
  onMapClick,
}: {
  points: { lat: number; lng: number }[];
  onPointDrag: (index: number, lat: number, lng: number) => void;
  onMapClick: (lat: number, lng: number) => void;
}) {
  const center: [number, number] =
    points.length > 0 ? [points[0].lat, points[0].lng] : SANTOS_COORDS;
  const latLngs = points.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-zinc-200">
      <MapContainer center={center} zoom={18} style={{ height: "280px", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point, index) => (
          <Marker
            key={index}
            position={[point.lat, point.lng]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const { lat, lng } = marker.getLatLng();
                onPointDrag(index, lat, lng);
              },
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -8]}>
              {index + 1}
            </Tooltip>
          </Marker>
        ))}
        {latLngs.length === 2 && (
          <Polyline positions={latLngs} pathOptions={{ color: "#da251c" }} />
        )}
        {latLngs.length >= 3 && (
          <Polygon
            positions={latLngs}
            pathOptions={{ color: "#da251c", fillColor: "#da251c", fillOpacity: 0.15 }}
          />
        )}
        <ClickHandler onPick={onMapClick} />
      </MapContainer>
      <p className="bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
        Clique no mapa para adicionar um ponto manualmente, ou arraste os marcadores para
        ajustar a posição de um ponto já criado.
      </p>
    </div>
  );
}
