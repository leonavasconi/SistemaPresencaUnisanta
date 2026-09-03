-- Permite ao admin desenhar a área do evento como um polígono de pontos
-- (ex: os 4 cantos de uma sala), em vez de apenas um círculo.
-- latitude/longitude/raio_metros continuam existindo e são calculados a
-- partir do centroide e do ponto mais distante do polígono, para que a
-- Edge Function de check-in (que só entende círculo) continue funcionando
-- sem alterações.

alter table public.eventos
  add column pontos_geofence jsonb not null default '[]'::jsonb;
