-- Deixa de assumir que todo participante é aluno da Unisanta.
--
-- Duas mudanças estruturais:
--   1. `alunos` vira `participantes` (o termo genérico do domínio);
--   2. RA, curso e instituição deixam de ser obrigatórios — passam a ser
--      dados específicos de quem marcou "Aluno Unisanta? = Sim".
--
-- Tudo é feito com ALTER ... RENAME / ALTER COLUMN, que preservam dados,
-- chaves estrangeiras, índices e políticas de RLS (o Postgres rastreia essas
-- dependências por OID e número de coluna, não por nome) — mesmo caminho já
-- usado na migration 0002. Nenhum registro é apagado.

-- ============================================================
-- alunos -> participantes
-- ============================================================
alter table public.alunos rename to participantes;

-- ============================================================
-- Dados acadêmicos passam a ser opcionais
-- ============================================================
-- A constraint UNIQUE de `matricula` continua valendo: no Postgres, UNIQUE
-- permite múltiplos NULL, então vários participantes externos (sem RA)
-- convivem sem conflito, e dois alunos Unisanta ainda não podem repetir RA.
alter table public.participantes alter column matricula drop not null;
alter table public.participantes alter column curso drop not null;
alter table public.participantes alter column instituicao drop not null;
alter table public.participantes alter column instituicao drop default;

-- ============================================================
-- Marca quem é aluno da Unisanta
-- ============================================================
-- Default `true` preserva a semântica dos registros já existentes: todos
-- foram cadastrados pelo formulário antigo, que só aceitava aluno Unisanta
-- e exigia RA e curso.
alter table public.participantes
  add column aluno_unisanta boolean not null default true;

-- Impede que um participante marcado como aluno Unisanta fique sem RA ou
-- curso — a regra do formulário passa a valer também no banco. Registros
-- já anonimizados pelo "excluir meus dados" (LGPD) ficam de fora, porque
-- ali apagar RA e curso é justamente o comportamento correto.
alter table public.participantes
  add constraint participantes_dados_academicos_check
  check (
    not aluno_unisanta
    or excluido_em is not null
    or (matricula is not null and curso is not null)
  );

-- ============================================================
-- aluno_id -> participante_id nas tabelas relacionadas
-- ============================================================
alter table public.registros_presenca rename column aluno_id to participante_id;
alter table public.dispositivos rename column aluno_id to participante_id;
alter table public.logs_consentimento rename column aluno_id to participante_id;

-- ============================================================
-- Nomes herdados do schema original em inglês
-- ============================================================
alter table public.participantes rename constraint students_pkey to participantes_pkey;
alter table public.participantes rename constraint students_matricula_key to participantes_matricula_key;
alter table public.registros_presenca
  rename constraint attendance_records_checkpoint_id_student_id_key
  to registros_presenca_momento_participante_key;
alter table public.registros_presenca
  rename constraint attendance_records_student_id_fkey
  to registros_presenca_participante_id_fkey;
alter table public.logs_consentimento
  rename constraint consent_logs_student_id_fkey
  to logs_consentimento_participante_id_fkey;
alter table public.dispositivos
  rename constraint device_fingerprints_student_id_fkey
  to dispositivos_participante_id_fkey;

alter index if exists idx_registros_presenca_aluno_id
  rename to idx_registros_presenca_participante_id;

-- ============================================================
-- Políticas de RLS (as regras não mudam, só os nomes)
-- ============================================================
alter policy "students can read own row" on public.participantes
  rename to "participantes podem ler a propria linha";
alter policy "students can insert own row" on public.participantes
  rename to "participantes podem inserir a propria linha";
alter policy "students can update own row" on public.participantes
  rename to "participantes podem atualizar a propria linha";
alter policy "students can read events" on public.eventos
  rename to "participantes podem ler eventos";
alter policy "students can read checkpoints" on public.momentos_presenca
  rename to "participantes podem ler momentos";
alter policy "students can read own attendance" on public.registros_presenca
  rename to "participantes podem ler a propria presenca";
alter policy "students can read own consent logs" on public.logs_consentimento
  rename to "participantes podem ler o proprio consentimento";
alter policy "students can insert own consent logs" on public.logs_consentimento
  rename to "participantes podem inserir o proprio consentimento";
