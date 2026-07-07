export function eventMatchesAudience(
  event: { cursos_alvo: string[]; salas_alvo: string[] },
  student: { curso?: string | null; sala?: string | null },
): boolean {
  const isOpen = event.cursos_alvo.length === 0 && event.salas_alvo.length === 0;
  if (isOpen) return true;

  const matchesCurso = !!student.curso && event.cursos_alvo.includes(student.curso);
  const matchesSala = !!student.sala && event.salas_alvo.includes(student.sala);
  return matchesCurso || matchesSala;
}
