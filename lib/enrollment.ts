/**
 * O que conta como "cadastro concluído" para um participante.
 *
 * Criar a conta é só o primeiro passo: o acesso ao sistema depende de a
 * pessoa ter passado pelo consentimento LGPD e pela captura do rosto em
 * /cadastro. Antes disso ela não pode circular pelas telas nem tentar
 * check-in — o descritor facial é o que prova identidade no momento da
 * presença, e o consentimento é o que autoriza tratar esses dados.
 *
 * A regra vive aqui, e não espalhada, porque é checada em dois lugares (o
 * middleware e a própria página de cadastro) e discordar entre eles abriria
 * exatamente a brecha que ela existe para fechar.
 */
export type EnrollmentState = {
  descritor_facial: unknown;
  consentimento_em: string | null;
  excluido_em: string | null;
};

export const ENROLLMENT_COLUMNS = "descritor_facial, consentimento_em, excluido_em";

export function isEnrollmentComplete(participante: EnrollmentState | null | undefined): boolean {
  if (!participante) return false;
  // Quem pediu exclusão dos dados (LGPD) precisa refazer o cadastro.
  if (participante.excluido_em) return false;
  if (!participante.consentimento_em) return false;

  return (
    Array.isArray(participante.descritor_facial) && participante.descritor_facial.length > 0
  );
}
