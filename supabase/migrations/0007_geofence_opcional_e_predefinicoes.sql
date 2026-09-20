-- Duas mudanças pedidas pelo professor:
--
-- 1) Evento pode ser criado sem área definida ainda (os pontos costumam ser
--    marcados presencialmente, depois que o evento já existe) — por isso
--    latitude/longitude/raio_metros deixam de ser obrigatórios.
-- 2) Áreas marcadas podem ser salvas com um nome (ex: "Sala 420A") e
--    reaproveitadas em outros eventos, em vez de remarcar os mesmos pontos
--    toda vez.

alter table public.eventos
  alter column latitude drop not null,
  alter column longitude drop not null,
  alter column raio_metros drop not null,
  alter column raio_metros drop default;

create table if not exists public.locais_geofence (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  pontos jsonb not null,
  criado_por uuid not null references public.perfis(id),
  criado_em timestamptz not null default now()
);

-- Constraint UNIQUE de tabela não aceita expressões (só nomes de coluna) —
-- precisa ser um índice único para travar por nome sem diferenciar maiúsculas.
create unique index if not exists locais_geofence_nome_lower_idx
  on public.locais_geofence (lower(nome));

alter table public.locais_geofence enable row level security;

-- Compartilhado entre todos os admins (não é "meu local", é "o local da
-- sala 420A"), então qualquer admin pode ler, criar, atualizar ou apagar.
drop policy if exists "admins can manage geofence presets" on public.locais_geofence;
create policy "admins can manage geofence presets"
  on public.locais_geofence for all
  using (exists (select 1 from public.perfis p where p.id = auth.uid()))
  with check (exists (select 1 from public.perfis p where p.id = auth.uid()));
