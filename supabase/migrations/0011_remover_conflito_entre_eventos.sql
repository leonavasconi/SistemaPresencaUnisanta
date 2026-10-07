-- Remove a regra "3.1" do check-in: recusar quem já tem presença aprovada em
-- OUTRO evento com horário sobreposto (motivo "janela_conflitante_outro_evento").
--
-- POR QUÊ
-- A coordenação decidiu concentrar os momentos de todos os eventos na mesma
-- janela (21h10 às 22h), então o mesmo participante precisa poder confirmar
-- presença em mais de um evento. A regra vivia aqui, dentro de fazer_checkin
-- (migration 0010).
--
-- COMO
-- Recria a função inteira como estava na 0010, apenas SEM o bloco 3.1 e a
-- variável v_conflict. O resto — janela de horário, área, dispositivo,
-- biometria e gravação — não muda. As permissões (revoke/grant) da 0010 são
-- mantidas, pois "create or replace" não as altera.
--
-- ATENÇÃO: arquivo para REVISÃO. Não é aplicado automaticamente pelo deploy
-- do site; quem aplica é quem tem acesso ao banco (supabase db push).

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
