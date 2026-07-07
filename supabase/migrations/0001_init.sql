-- Unisanta Presença — schema inicial
-- Extensões
create extension if not exists "pgcrypto";

-- ============================================================
-- profiles (administradores)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "admins can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- ============================================================
-- students (alunos)
-- ============================================================
create table public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  institution text not null default 'Unisanta',
  matricula text not null unique,
  course text not null,
  face_descriptor double precision[] not null,
  consent_at timestamptz not null,
  consent_version text not null,
  device_fingerprint_seed text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.students enable row level security;

create policy "students can read own row"
  on public.students for select
  using (auth.uid() = id);

create policy "students can insert own row"
  on public.students for insert
  with check (auth.uid() = id);

create policy "students can update own row"
  on public.students for update
  using (auth.uid() = id);

-- ============================================================
-- events (eventos)
-- ============================================================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters integer not null default 100,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "admins can manage events"
  on public.events for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "students can read events"
  on public.events for select
  using (true);

-- ============================================================
-- event_checkpoints (momentos de presença, quantidade livre)
-- ============================================================
create table public.event_checkpoints (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  label text not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  order_index integer not null default 0,
  qr_token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

alter table public.event_checkpoints enable row level security;

create policy "admins can manage checkpoints"
  on public.event_checkpoints for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy "students can read checkpoints"
  on public.event_checkpoints for select
  using (true);

-- ============================================================
-- device_fingerprints (fallback 3.7 — 1 aparelho = 1 aluno por evento)
-- ============================================================
create table public.device_fingerprints (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  device_hash text not null,
  created_at timestamptz not null default now(),
  unique (event_id, device_hash)
);

alter table public.device_fingerprints enable row level security;
-- sem policies de client: somente a service role (Edge Function) acessa esta tabela.

-- ============================================================
-- attendance_records (registros de presença)
-- ============================================================
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  checkpoint_id uuid not null references public.event_checkpoints(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  latitude double precision not null,
  longitude double precision not null,
  accuracy_m double precision,
  distance_m double precision not null,
  face_match_score double precision not null,
  status text not null check (status in ('approved', 'rejected')),
  rejection_reason text,
  device_hash text,
  created_at timestamptz not null default now(),
  unique (checkpoint_id, student_id)
);

alter table public.attendance_records enable row level security;

create policy "students can read own attendance"
  on public.attendance_records for select
  using (auth.uid() = student_id);

create policy "admins can read all attendance"
  on public.attendance_records for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid()));

-- Nenhuma policy de insert/update/delete para o client: só a service role
-- (usada pela Edge Function `checkin`) pode gravar, após validar tudo no servidor.

-- ============================================================
-- consent_logs (trilha de consentimento LGPD)
-- ============================================================
create table public.consent_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  consent_version text not null,
  action text not null check (action in ('granted', 'revoked')),
  ip_address text,
  created_at timestamptz not null default now()
);

alter table public.consent_logs enable row level security;

create policy "students can read own consent logs"
  on public.consent_logs for select
  using (auth.uid() = student_id);

create policy "students can insert own consent logs"
  on public.consent_logs for insert
  with check (auth.uid() = student_id);

-- ============================================================
-- audit_logs (auditoria geral — 3.6.c)
-- ============================================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create policy "admins can read audit logs"
  on public.audit_logs for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid()));

-- ============================================================
-- índices úteis
-- ============================================================
create index idx_event_checkpoints_event_id on public.event_checkpoints(event_id);
create index idx_attendance_event_id on public.attendance_records(event_id);
create index idx_attendance_checkpoint_id on public.attendance_records(checkpoint_id);
create index idx_attendance_student_id on public.attendance_records(student_id);
create index idx_device_fp_event_id on public.device_fingerprints(event_id);
