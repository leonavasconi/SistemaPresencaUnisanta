-- Check-in como função no banco (RPC), substituindo a Edge Function `checkin`.
--
-- POR QUÊ
-- A Edge Function fazia ~9 consultas SEQUENCIAIS ao Postgres por check-in
-- (resolver momento → checar presença → checar conflito → evento →
-- dispositivo → participante → inserir presença → upsert dispositivo →
-- log de auditoria). Cada uma é um round-trip de rede; no pico de abertura
-- do evento, centenas de alunos em paralelo seguravam conexões por tempo
-- demais e o pool do Supabase saturava. Aqui tudo roda DENTRO do banco, numa
-- única chamada e numa única transação: 9 idas viram 1, a conexão é segurada
-- por menos tempo (melhor ainda no free tier, que tem menos conexões) e o
-- registro passa a ser atômico de graça.
--
-- COMO A SEGURANÇA SE MANTÉM
-- O cliente continua SEM poder escrever direto em `registros_presenca`
-- (nenhuma policy de insert — ver 0001_init.sql). Antes, só a service role da
-- Edge Function escrevia; agora é esta função, declarada SECURITY DEFINER, que
-- roda como dona e contorna o RLS depois de validar tudo. A identidade do
-- participante vem de `auth.uid()` (o JWT que o PostgREST já validou), não mais
-- de um `getClaims` manual.
--
-- PARIDADE
-- As regras e a geometria são um porte fiel de
-- `supabase/functions/checkin/index.ts` e `lib/geo/polygon.ts` — mesmos
-- limiares (distância facial 0.5, tolerância de GPS até 30 m, área mínima de
-- geofence 25 m²), mesma ordem de checagem e as mesmas respostas
-- (`approved` / `already_registered` / `rejected` + motivo).

set search_path = '';

-- ============================================================
-- Helpers geométricos (espelham lib/geo/polygon.ts)
-- Puros, IMMUTABLE, sem acesso a tabelas. Raio da Terra = 6_371_000 m
-- (modelo esférico, idêntico ao usado no app e na Edge Function).
-- ============================================================

-- Distância de Haversine em metros.
create or replace function public._haversine_m(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
) returns double precision
language sql immutable as $$
  select 6371000 * 2 * atan2(sqrt(a), sqrt(1 - a))
  from (
    select
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians(lon2 - lon1) / 2), 2) as a
  ) s;
$$;

-- Distância de um ponto a um segmento, no plano projetado em metros.
create or replace function public._dist_to_segment(
  px double precision, py double precision,
  ax double precision, ay double precision,
  bx double precision, by double precision
) returns double precision
language plpgsql immutable as $$
declare
  len_sq double precision := power(bx - ax, 2) + power(by - ay, 2);
  t double precision;
begin
  if len_sq = 0 then
    return sqrt(power(px - ax, 2) + power(py - ay, 2));
  end if;
  t := greatest(0, least(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / len_sq));
  return sqrt(power(px - (ax + t * (bx - ax)), 2) + power(py - (ay + t * (by - ay)), 2));
end;
$$;

-- Área do polígono em m² (shoelace sobre o plano projetado). Pontos com
-- lat/lng não numéricos são ignorados, como no filtro Number.isFinite do app.
create or replace function public._polygon_area_m2(p_points jsonb)
returns double precision
language plpgsql immutable as $$
declare
  r constant double precision := 6371000;
  lats double precision[];
  lngs double precision[];
  vx double precision[];
  vy double precision[];
  n int;
  i int;
  j int;
  origin_lat double precision;
  origin_lng double precision;
  s double precision := 0;
begin
  select array_agg((e->>'lat')::double precision order by ord),
         array_agg((e->>'lng')::double precision order by ord)
    into lats, lngs
  from jsonb_array_elements(p_points) with ordinality as t(e, ord)
  where jsonb_typeof(e->'lat') = 'number' and jsonb_typeof(e->'lng') = 'number';

  n := coalesce(array_length(lats, 1), 0);
  if n < 3 then
    return 0;
  end if;

  origin_lat := lats[1];
  origin_lng := lngs[1];
  vx := array_fill(0::double precision, array[n]);
  vy := array_fill(0::double precision, array[n]);
  for i in 1..n loop
    vx[i] := r * radians(lngs[i] - origin_lng) * cos(radians(origin_lat));
    vy[i] := r * radians(lats[i] - origin_lat);
  end loop;

  j := n;
  for i in 1..n loop
    s := s + vx[j] * vy[i] - vx[i] * vy[j];
    j := i;
  end loop;

  return abs(s) / 2;
end;
$$;

-- Geofence "usável": pelo menos 3 pontos válidos E área >= 25 m² (senão
-- recai no círculo centro+raio; ver comentário em isUsableGeofence no app).
create or replace function public._usable_geofence(p_points jsonb)
returns boolean
language sql immutable as $$
  select (
    select count(*)
    from jsonb_array_elements(p_points) e
    where jsonb_typeof(e->'lat') = 'number' and jsonb_typeof(e->'lng') = 'number'
  ) >= 3
  and public._polygon_area_m2(p_points) >= 25;
$$;

-- Ponto dentro da área (ray casting) + distância até a borda. Devolve "dentro"
-- se o ponto está no polígono OU a até `p_tol` metros de uma aresta.
create or replace function public._geofence_check(
  p_points jsonb,
  p_lat double precision,
  p_lng double precision,
  p_tol double precision
) returns table(is_inside boolean, distance_edge_m double precision)
language plpgsql immutable as $$
declare
  r constant double precision := 6371000;
  lats double precision[];
  lngs double precision[];
  vx double precision[];
  vy double precision[];
  n int;
  i int;
  j int;
  origin_lat double precision;
  origin_lng double precision;
  px double precision;
  py double precision;
  inside boolean := false;
  shortest double precision := 'Infinity';
  seg double precision;
begin
  select array_agg((e->>'lat')::double precision order by ord),
         array_agg((e->>'lng')::double precision order by ord)
    into lats, lngs
  from jsonb_array_elements(p_points) with ordinality as t(e, ord)
  where jsonb_typeof(e->'lat') = 'number' and jsonb_typeof(e->'lng') = 'number';

  n := coalesce(array_length(lats, 1), 0);
  if n < 3 then
    return query select false, 'Infinity'::double precision;
    return;
  end if;

  origin_lat := lats[1];
  origin_lng := lngs[1];
  px := r * radians(p_lng - origin_lng) * cos(radians(origin_lat));
  py := r * radians(p_lat - origin_lat);

  vx := array_fill(0::double precision, array[n]);
  vy := array_fill(0::double precision, array[n]);
  for i in 1..n loop
    vx[i] := r * radians(lngs[i] - origin_lng) * cos(radians(origin_lat));
    vy[i] := r * radians(lats[i] - origin_lat);
  end loop;

  -- Ray casting: número ímpar de cruzamentos => dentro.
  j := n;
  for i in 1..n loop
    if ((vy[i] > py) <> (vy[j] > py))
       and (px < (vx[j] - vx[i]) * (py - vy[i]) / (vy[j] - vy[i]) + vx[i]) then
      inside := not inside;
    end if;
    j := i;
  end loop;

  if inside then
    return query select true, 0::double precision;
    return;
  end if;

  j := n;
  for i in 1..n loop
    seg := public._dist_to_segment(px, py, vx[j], vy[j], vx[i], vy[i]);
    if seg < shortest then
      shortest := seg;
    end if;
    j := i;
  end loop;

  return query select (shortest <= p_tol), shortest;
end;
$$;

-- Distância euclidiana entre dois descritores faciais (128 floats cada).
create or replace function public._euclidean_descriptor(
  a double precision[], b double precision[]
) returns double precision
language sql immutable as $$
  select sqrt(coalesce(sum(power(a[i] - b[i], 2)), 0))
  from generate_subscripts(a, 1) as i;
$$;

-- ============================================================
-- Função principal de check-in
-- ============================================================
create or replace function public.fazer_checkin(
  p_qr_token text,
  p_descriptor double precision[],
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision default null,
  p_device_hash text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  face_match_threshold constant double precision := 0.5;
  descriptor_length constant int := 128;
  max_gps_tolerance_m constant double precision := 30;

  v_participant_id uuid;
  v_checkpoint record;
  v_existing record;
  v_conflict boolean;
  v_event record;
  v_tolerance double precision;
  v_has_circle boolean;
  v_usable boolean;
  v_distance_to_center double precision := 0;
  v_geo record;
  v_device_owner uuid;
  v_descriptor_db double precision[];
  v_face_distance double precision;
  v_closes_window timestamptz;
begin
  -- Identidade do participante a partir do JWT (validado pelo PostgREST).
  v_participant_id := auth.uid();
  if v_participant_id is null then
    return jsonb_build_object('status', 'rejected', 'reason', 'nao_autenticado');
  end if;

  -- Validação do payload (espelha a checagem da Edge Function).
  if p_qr_token is null or p_qr_token = ''
     or p_descriptor is null
     or array_length(p_descriptor, 1) is distinct from descriptor_length
     or p_latitude is null or p_longitude is null
     or p_latitude = 'NaN'::double precision or p_longitude = 'NaN'::double precision
     or abs(p_latitude) = 'Infinity'::double precision
     or abs(p_longitude) = 'Infinity'::double precision
     or p_device_hash is null or p_device_hash = ''
  then
    return jsonb_build_object('status', 'rejected', 'reason', 'payload_invalido');
  end if;

  -- 1. Resolve o momento pelo QR Code.
  select id, evento_id, abre_em, fecha_em, rotulo
    into v_checkpoint
  from public.momentos_presenca
  where token_qr = p_qr_token;
  if not found then
    return jsonb_build_object('status', 'rejected', 'reason', 'checkpoint_nao_encontrado');
  end if;

  -- 2. Presença única por momento: se já existe, devolve o estado atual.
  select id, registrado_em into v_existing
  from public.registros_presenca
  where momento_id = v_checkpoint.id and participante_id = v_participant_id;
  if found then
    return jsonb_build_object(
      'status', 'already_registered',
      'checkpoint', v_checkpoint.rotulo,
      'recordedAt', v_existing.registrado_em
    );
  end if;

  -- 3. Janela de horário, tolerante até o fim do minuto de fechamento.
  v_closes_window := date_trunc('minute', v_checkpoint.fecha_em) + interval '1 minute';
  if now() < v_checkpoint.abre_em or now() >= v_closes_window then
    return jsonb_build_object('status', 'rejected', 'reason', 'fora_da_janela_de_horario');
  end if;

  -- 3.1. Conflito com outro evento cuja janela se sobrepõe a esta.
  select exists (
    select 1
    from public.registros_presenca r
    join public.momentos_presenca m on m.id = r.momento_id
    where r.participante_id = v_participant_id
      and r.situacao = 'aprovado'
      and r.evento_id <> v_checkpoint.evento_id
      and m.abre_em < v_checkpoint.fecha_em
      and v_checkpoint.abre_em < m.fecha_em
  ) into v_conflict;
  if v_conflict then
    return jsonb_build_object('status', 'rejected', 'reason', 'janela_conflitante_outro_evento');
  end if;

  -- 4. Evento + área.
  select id, latitude, longitude, raio_metros, pontos_geofence
    into v_event
  from public.eventos
  where id = v_checkpoint.evento_id;
  if not found then
    return jsonb_build_object('status', 'rejected', 'reason', 'evento_nao_encontrado');
  end if;

  v_tolerance := least(coalesce(p_accuracy_meters, 0), max_gps_tolerance_m);
  v_has_circle := v_event.latitude is not null
    and v_event.longitude is not null
    and v_event.raio_metros is not null;
  v_usable := public._usable_geofence(v_event.pontos_geofence);

  if not v_usable and not v_has_circle then
    return jsonb_build_object('status', 'rejected', 'reason', 'area_nao_configurada');
  end if;

  if v_has_circle then
    v_distance_to_center :=
      public._haversine_m(p_latitude, p_longitude, v_event.latitude, v_event.longitude);
  end if;

  if v_usable then
    select is_inside, distance_edge_m into v_geo
    from public._geofence_check(v_event.pontos_geofence, p_latitude, p_longitude, v_tolerance);
    if not v_geo.is_inside then
      return jsonb_build_object(
        'status', 'rejected', 'reason', 'fora_da_area_do_evento',
        'distance_m', round(v_geo.distance_edge_m)::int
      );
    end if;
  else
    if v_distance_to_center > v_event.raio_metros + v_tolerance then
      return jsonb_build_object(
        'status', 'rejected', 'reason', 'fora_da_area_do_evento',
        'distance_m', round(v_distance_to_center)::int
      );
    end if;
  end if;

  -- 5. 1 aparelho = 1 participante por evento.
  select participante_id into v_device_owner
  from public.dispositivos
  where evento_id = v_event.id and hash_dispositivo = p_device_hash;
  if found and v_device_owner <> v_participant_id then
    return jsonb_build_object(
      'status', 'rejected', 'reason', 'dispositivo_ja_utilizado_por_outro_participante'
    );
  end if;

  -- 6. Biometria facial (comparação no servidor).
  select descritor_facial into v_descriptor_db
  from public.participantes
  where id = v_participant_id;
  if not found
     or v_descriptor_db is null
     or array_length(v_descriptor_db, 1) is distinct from descriptor_length
  then
    return jsonb_build_object('status', 'rejected', 'reason', 'participante_nao_cadastrado');
  end if;

  v_face_distance := public._euclidean_descriptor(p_descriptor, v_descriptor_db);
  if v_face_distance > face_match_threshold then
    insert into public.logs_auditoria(ator_id, acao, entidade, entidade_id, metadados)
    values (
      v_participant_id, 'presenca_rejeitada', 'registros_presenca', v_checkpoint.id,
      jsonb_build_object('reason', 'biometria_nao_confere', 'face_distance', v_face_distance)
    );
    return jsonb_build_object('status', 'rejected', 'reason', 'biometria_nao_confere');
  end if;

  -- 7. Grava o registro. A constraint unique (momento_id, participante_id)
  --    é a garantia final contra duas requisições simultâneas: a segunda cai
  --    aqui e vira "já registrado", não um erro.
  begin
    insert into public.registros_presenca(
      evento_id, momento_id, participante_id, latitude, longitude,
      precisao_m, distancia_m, pontuacao_facial, situacao, hash_dispositivo
    ) values (
      v_event.id, v_checkpoint.id, v_participant_id, p_latitude, p_longitude,
      p_accuracy_meters, v_distance_to_center, v_face_distance, 'aprovado', p_device_hash
    );
  exception when unique_violation then
    return jsonb_build_object(
      'status', 'already_registered', 'checkpoint', v_checkpoint.rotulo
    );
  end;

  insert into public.dispositivos(evento_id, participante_id, hash_dispositivo)
  values (v_event.id, v_participant_id, p_device_hash)
  on conflict (evento_id, hash_dispositivo)
    do update set participante_id = excluded.participante_id;

  insert into public.logs_auditoria(ator_id, acao, entidade, entidade_id, metadados)
  values (
    v_participant_id, 'presenca_aprovada', 'registros_presenca', v_checkpoint.id,
    jsonb_build_object('distance_m', v_distance_to_center, 'face_distance', v_face_distance)
  );

  return jsonb_build_object('status', 'approved', 'checkpoint', v_checkpoint.rotulo);
end;
$$;

-- Só participante logado chama o check-in; anon não.
revoke all on function public.fazer_checkin(
  text, double precision[], double precision, double precision, double precision, text
) from public;
grant execute on function public.fazer_checkin(
  text, double precision[], double precision, double precision, double precision, text
) to authenticated;
