-- Traduz nomes de tabelas e colunas para português.
-- Usa ALTER TABLE ... RENAME, que preserva dados, chaves estrangeiras,
-- índices e políticas de RLS existentes (o Postgres rastreia essas
-- dependências por OID, não por nome).

-- ============================================================
-- profiles -> perfis
-- ============================================================
alter table public.profiles rename to perfis;
alter table public.perfis rename column full_name to nome_completo;
alter table public.perfis rename column role to papel;
alter table public.perfis rename column created_at to criado_em;

-- ============================================================
-- students -> alunos
-- ============================================================
alter table public.students rename to alunos;
alter table public.alunos rename column full_name to nome_completo;
alter table public.alunos rename column institution to instituicao;
alter table public.alunos rename column course to curso;
alter table public.alunos rename column face_descriptor to descritor_facial;
alter table public.alunos rename column consent_at to consentimento_em;
alter table public.alunos rename column consent_version to versao_consentimento;
alter table public.alunos rename column device_fingerprint_seed to semente_dispositivo;
alter table public.alunos rename column deleted_at to excluido_em;
alter table public.alunos rename column created_at to criado_em;
alter table public.alunos rename column updated_at to atualizado_em;

-- ============================================================
-- events -> eventos
-- ============================================================
alter table public.events rename to eventos;
alter table public.eventos rename column name to nome;
alter table public.eventos rename column description to descricao;
alter table public.eventos rename column radius_meters to raio_metros;
alter table public.eventos rename column starts_at to inicio_em;
alter table public.eventos rename column ends_at to fim_em;
alter table public.eventos rename column created_by to criado_por;
alter table public.eventos rename column created_at to criado_em;

-- ============================================================
-- event_checkpoints -> momentos_presenca
-- ============================================================
alter table public.event_checkpoints rename to momentos_presenca;
alter table public.momentos_presenca rename column event_id to evento_id;
alter table public.momentos_presenca rename column label to rotulo;
alter table public.momentos_presenca rename column opens_at to abre_em;
alter table public.momentos_presenca rename column closes_at to fecha_em;
alter table public.momentos_presenca rename column order_index to ordem;
alter table public.momentos_presenca rename column qr_token to token_qr;
alter table public.momentos_presenca rename column created_at to criado_em;

-- ============================================================
-- device_fingerprints -> dispositivos
-- ============================================================
alter table public.device_fingerprints rename to dispositivos;
alter table public.dispositivos rename column event_id to evento_id;
alter table public.dispositivos rename column student_id to aluno_id;
alter table public.dispositivos rename column device_hash to hash_dispositivo;
alter table public.dispositivos rename column created_at to criado_em;

-- ============================================================
-- attendance_records -> registros_presenca
-- ============================================================
alter table public.attendance_records rename to registros_presenca;
alter table public.registros_presenca rename column event_id to evento_id;
alter table public.registros_presenca rename column checkpoint_id to momento_id;
alter table public.registros_presenca rename column student_id to aluno_id;
alter table public.registros_presenca rename column recorded_at to registrado_em;
alter table public.registros_presenca rename column accuracy_m to precisao_m;
alter table public.registros_presenca rename column distance_m to distancia_m;
alter table public.registros_presenca rename column face_match_score to pontuacao_facial;
alter table public.registros_presenca rename column status to situacao;
alter table public.registros_presenca rename column rejection_reason to motivo_rejeicao;
alter table public.registros_presenca rename column device_hash to hash_dispositivo;
alter table public.registros_presenca rename column created_at to criado_em;

alter table public.registros_presenca drop constraint if exists attendance_records_status_check;
update public.registros_presenca set situacao = 'aprovado' where situacao = 'approved';
update public.registros_presenca set situacao = 'rejeitado' where situacao = 'rejected';
alter table public.registros_presenca add constraint registros_presenca_situacao_check
  check (situacao in ('aprovado', 'rejeitado'));

-- ============================================================
-- consent_logs -> logs_consentimento
-- ============================================================
alter table public.consent_logs rename to logs_consentimento;
alter table public.logs_consentimento rename column student_id to aluno_id;
alter table public.logs_consentimento rename column consent_version to versao_consentimento;
alter table public.logs_consentimento rename column action to acao;
alter table public.logs_consentimento rename column ip_address to endereco_ip;
alter table public.logs_consentimento rename column created_at to criado_em;

alter table public.logs_consentimento drop constraint if exists consent_logs_action_check;
update public.logs_consentimento set acao = 'concedido' where acao = 'granted';
update public.logs_consentimento set acao = 'revogado' where acao = 'revoked';
alter table public.logs_consentimento add constraint logs_consentimento_acao_check
  check (acao in ('concedido', 'revogado'));

-- ============================================================
-- audit_logs -> logs_auditoria
-- ============================================================
alter table public.audit_logs rename to logs_auditoria;
alter table public.logs_auditoria rename column actor_id to ator_id;
alter table public.logs_auditoria rename column action to acao;
alter table public.logs_auditoria rename column entity to entidade;
alter table public.logs_auditoria rename column entity_id to entidade_id;
alter table public.logs_auditoria rename column metadata to metadados;
alter table public.logs_auditoria rename column created_at to criado_em;

update public.logs_auditoria set acao = 'presenca_aprovada' where acao = 'checkin_aprovado';
update public.logs_auditoria set acao = 'presenca_rejeitada' where acao = 'checkin_rejeitado';

-- ============================================================
-- renomeia índices para acompanhar os novos nomes
-- ============================================================
alter index if exists idx_event_checkpoints_event_id rename to idx_momentos_presenca_evento_id;
alter index if exists idx_attendance_event_id rename to idx_registros_presenca_evento_id;
alter index if exists idx_attendance_checkpoint_id rename to idx_registros_presenca_momento_id;
alter index if exists idx_attendance_student_id rename to idx_registros_presenca_aluno_id;
alter index if exists idx_device_fp_event_id rename to idx_dispositivos_evento_id;
