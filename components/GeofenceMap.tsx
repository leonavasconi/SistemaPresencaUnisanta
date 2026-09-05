"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon,
  Polyline,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Corrige os ícones padrão do Leaflet, que não são resolvidos automaticamente
// pelo bundler do Next.js.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/** Campus da Unisanta — ponto informado pela coordenação do projeto. */
const UNISANTA_COORDS: [number, number] = [-23.963808218807497, -46.32156997919083];
const ZOOM_PADRAO = 17;

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Garante o enquadramento correto na abertura.
 *
 * O `center` do MapContainer só vale na montagem, e o Leaflet calcula o
 * enquadramento a partir do tamanho do container. Como este mapa é carregado
 * dinamicamente (ssr: false) dentro de um card que ainda está se
 * dimensionando, ele às vezes media altura/largura erradas e abria numa
 * região distante — daí o mapa aparecer mostrando o litoral inteiro em vez do
 * campus. `invalidateSize` remede o container e `setView` reposiciona.
 */
function EnquadrarNaAbertura({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    map.setView(center, zoom);
    // Uma segunda passada após o layout assentar, para o caso de o card ainda
    // estar crescendo no primeiro quadro.
    const t = setTimeout(() => {
      map.invalidateSize();
      map.setView(center, zoom);
    }, 250);
    return () => clearTimeout(t);
    // Só na montagem: depois disso, quem manda no mapa é o usuário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  // Sem pontos marcados, o mapa abre no campus — é de lá que o organizador
  // parte na esmagadora maioria dos eventos.
  const center: [number, number] =
    points.length > 0 ? [points[0].lat, points[0].lng] : UNISANTA_COORDS;
  const latLngs = points.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-zinc-200">
      <MapContainer center={center} zoom={ZOOM_PADRAO} style={{ height: "280px", width: "100%" }}>
        <EnquadrarNaAbertura center={center} zoom={ZOOM_PADRAO} />
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
        Clique no mapa para marcar um ponto, ou arraste os marcadores para ajustar a
        posição de um ponto já criado. Os 3 pontos formam a área triangular do evento.
      </p>
    </div>
  );
}
