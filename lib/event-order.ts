/**
 * Ordem das listas de eventos (participante e administrador).
 *
 * Primeiro os que ainda não encerraram, do mais próximo para o mais distante
 * (o que está acontecendo agora vem antes do de amanhã); depois os já
 * encerrados, do mais recente para o mais antigo. Um evento encerra quando
 * passa do `fim_em` dele — não do último momento de presença.
 */
export function ordenarEventos<T extends { inicio_em: string; fim_em: string }>(
  events: T[],
  now: number = Date.now(),
): (T & { encerrado: boolean })[] {
  const marcados = events.map((event) => ({
    ...event,
    encerrado: new Date(event.fim_em).getTime() <= now,
  }));

  const ativos = marcados
    .filter((event) => !event.encerrado)
    .sort((a, b) => new Date(a.inicio_em).getTime() - new Date(b.inicio_em).getTime());

  const encerrados = marcados
    .filter((event) => event.encerrado)
    .sort((a, b) => new Date(b.fim_em).getTime() - new Date(a.fim_em).getTime());

  return [...ativos, ...encerrados];
}
