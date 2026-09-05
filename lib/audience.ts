/**
 * Decide se um evento aparece para um participante.
 *
 * Curso e sala são dados que só existem para alunos da Unisanta, então um
 * evento restrito a cursos ou salas simplesmente não alcança participantes
 * externos — que não têm como corresponder ao filtro. Eventos sem restrição
 * (o padrão) continuam visíveis para todo mundo.
 */
export function eventMatchesAudience(
  event: { cursos_alvo: string[]; salas_alvo: string[] },
  participant: { curso?: string | null; sala?: string | null },
): boolean {
  const isOpen = event.cursos_alvo.length === 0 && event.salas_alvo.length === 0;
  if (isOpen) return true;

  const matchesCurso = !!participant.curso && event.cursos_alvo.includes(participant.curso);
  const matchesSala = !!participant.sala && event.salas_alvo.includes(participant.sala);
  return matchesCurso || matchesSala;
}
