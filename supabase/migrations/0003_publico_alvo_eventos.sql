-- Permite ao admin restringir um evento a determinados cursos e/ou salas.
-- Arrays vazios (padrão) significam "visível para todos os alunos".

alter table public.eventos
  add column cursos_alvo text[] not null default '{}';

alter table public.eventos
  add column salas_alvo text[] not null default '{}';

alter table public.alunos
  add column sala text;
