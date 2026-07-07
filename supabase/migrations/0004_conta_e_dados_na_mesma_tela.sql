-- Agora os dados pessoais são coletados junto com a criação da conta
-- (mesma tela), antes do consentimento e da biometria existirem. Por isso
-- consentimento_em/versao_consentimento passam a ser opcionais até o aluno
-- concluir a etapa de consentimento + rosto em /cadastro.

alter table public.alunos alter column consentimento_em drop not null;
alter table public.alunos alter column versao_consentimento drop not null;
