// O app é de uso exclusivo da Unisanta (Santos/SP), então fixamos o fuso em
// America/Sao_Paulo (UTC-3, sem horário de verão desde 2019) em vez de
// confiar no fuso horário configurado no processo do servidor — o valor de
// um <input type="datetime-local"> não carrega informação de fuso, e
// `new Date(string)` o interpretaria usando o fuso do servidor (que pode
// ser UTC na Vercel), gerando uma janela de horário deslocada em 3 horas.
const SAO_PAULO_OFFSET_HOURS = 3;

/** Converte o valor de um <input type="datetime-local"> (horário de Brasília) para um Date (instante UTC correto). */
export function parseSaoPauloDateTime(localValue: string): Date {
  const asIfUtc = new Date(`${localValue}:00Z`);
  return new Date(asIfUtc.getTime() + SAO_PAULO_OFFSET_HOURS * 60 * 60 * 1000);
}

/** Converte um Date (instante UTC) para o formato aceito por <input type="datetime-local">, já no horário de Brasília. */
export function toDatetimeLocalValue(date: Date): string {
  const shifted = new Date(date.getTime() - SAO_PAULO_OFFSET_HOURS * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}
