-- Corrige participantes que ficaram inconsistentes após a exclusão dos dados
-- e antes da reativação do cadastro facial.
--
-- Se a pessoa não tem mais matrícula/curso válidos e o registro foi reativado,
-- ela não pode continuar como aluno Unisanta. Isso mantém a check constraint
-- `participantes_dados_academicos_check` consistente no banco.
update public.participantes
set
  aluno_unisanta = false,
  matricula = null,
  curso = null,
  instituicao = null
where
  aluno_unisanta = true
  and excluido_em is null
  and (matricula is null or curso is null);
