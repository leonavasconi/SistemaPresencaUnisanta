-- Bug: o painel do evento (e a exportação CSV/XLSX) mostravam "-" no nome e
-- no RA dos participantes, mesmo com os dados presentes na tabela.
--
-- Causa: `registros_presenca` embute `participantes(nome_completo, ...)` na
-- consulta, e o PostgREST aplica RLS de `participantes` também na relação
-- embutida. A única policy de select em `participantes` é "cada um lê a
-- própria linha" (auth.uid() = id) — o admin não é o próprio participante,
-- então a relação embutida vinha vazia, mesmo ele podendo ler o registro de
-- presença em si (que tem policy própria de admin).

create policy "admins can read participantes"
  on public.participantes for select
  using (exists (select 1 from public.perfis p where p.id = auth.uid()));
