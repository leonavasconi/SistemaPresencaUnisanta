import { parseSaoPauloDateTime, toDatetimeLocalValue } from "@/lib/datetime";

/** Um momento de presença ainda não salvo (ou já existente, quando `id` está presente). Sem rótulo — a ordem cronológica define o número exibido (Momento 1, 2, 3...). */
export type CheckpointDraft = {
  id?: string;
  opensAt: string;
  closesAt: string;
};

const BLANK_CHECKPOINT: CheckpointDraft = { opensAt: "", closesAt: "" };

/**
 * Gera os 3 momentos padrão (início, meio, encerramento) a partir do intervalo do evento,
 * usados como ponto de partida da lista editável de momentos — o usuário pode ajustar,
 * remover ou adicionar outros a partir daí. Enquanto o início/fim do evento não estiverem
 * preenchidos, os horários ficam vazios (nada de datas "chutadas").
 */
export function computeDefaultCheckpoints(
  startsAtLocal: string,
  endsAtLocal: string,
): CheckpointDraft[] {
  if (!startsAtLocal || !endsAtLocal) {
    return [{ ...BLANK_CHECKPOINT }, { ...BLANK_CHECKPOINT }, { ...BLANK_CHECKPOINT }];
  }

  const startsAt = parseSaoPauloDateTime(startsAtLocal);
  const endsAt = parseSaoPauloDateTime(endsAtLocal);

  const durationMs = Math.max(endsAt.getTime() - startsAt.getTime(), 0);
  const windowMs = Math.max(5 * 60 * 1000, Math.min(20 * 60 * 1000, durationMs / 6));
  const midPoint = startsAt.getTime() + durationMs / 2;

  const checkpoints = [
    { opensAt: startsAt, closesAt: new Date(startsAt.getTime() + windowMs) },
    {
      opensAt: new Date(midPoint - windowMs / 2),
      closesAt: new Date(midPoint + windowMs / 2),
    },
    { opensAt: new Date(endsAt.getTime() - windowMs), closesAt: endsAt },
  ];

  return checkpoints.map((cp) => ({
    opensAt: toDatetimeLocalValue(cp.opensAt),
    closesAt: toDatetimeLocalValue(cp.closesAt),
  }));
}

/** Ordena os momentos por horário de abertura (mais cedo primeiro); os que ainda não têm horário ficam por último, na ordem em que foram adicionados. */
export function sortCheckpointsByTime<T extends { opensAt: string; closesAt: string }>(
  checkpoints: T[],
): T[] {
  const sortKey = (cp: T) => cp.opensAt || cp.closesAt || "\uffff";
  return [...checkpoints].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

/**
 * Nomes dos momentos por posição cronológica. Os três primeiros ganham o
 * papel que costumam ter num evento; a partir do quarto, volta a numeração,
 * porque não há um nome natural para "o momento do meio, parte 3".
 */
const NOMES_POR_POSICAO = ["Abertura", "Desenvolvimento", "Encerramento"];

/** Rótulo salvo no banco para o momento — não é editável, só indica a posição cronológica. */
export function checkpointLabel(position: number): string {
  return NOMES_POR_POSICAO[position] ?? `Momento ${position + 1}`;
}

/**
 * Valida a agenda de momentos de um evento: precisa ter pelo menos um, cada um precisa
 * fechar depois de abrir, nenhum pode ficar fora da janela do evento (quando ela é
 * conhecida) e eles não podem se sobrepor nem repetir horário entre si. Usada tanto no
 * cliente (para desabilitar o botão de salvar) quanto no servidor (fonte da verdade).
 */
export function validateCheckpointsSchedule(
  checkpoints: CheckpointDraft[],
  eventStartsAtLocal: string,
  eventEndsAtLocal: string,
): string | null {
  if (checkpoints.length === 0) return "Adicione pelo menos um momento de presença";

  for (const cp of checkpoints) {
    if (!cp.opensAt || !cp.closesAt) {
      return "Todos os momentos precisam de horário de abertura e fechamento";
    }
    if (parseSaoPauloDateTime(cp.closesAt) <= parseSaoPauloDateTime(cp.opensAt)) {
      return "Um momento precisa fechar depois de abrir";
    }
  }

  if (eventStartsAtLocal && eventEndsAtLocal) {
    const eventStart = parseSaoPauloDateTime(eventStartsAtLocal);
    const eventEnd = parseSaoPauloDateTime(eventEndsAtLocal);
    if (eventEnd <= eventStart) return "O fim do evento precisa ser depois do início";

    for (const cp of checkpoints) {
      if (parseSaoPauloDateTime(cp.opensAt) < eventStart) {
        return "Nenhum momento pode abrir antes do início do evento";
      }
      if (parseSaoPauloDateTime(cp.closesAt) > eventEnd) {
        return "Nenhum momento pode fechar depois do fim do evento";
      }
    }
  }

  const sorted = sortCheckpointsByTime(checkpoints);
  for (let i = 1; i < sorted.length; i++) {
    if (parseSaoPauloDateTime(sorted[i].opensAt) < parseSaoPauloDateTime(sorted[i - 1].closesAt)) {
      return "Os momentos não podem se sobrepor nem repetir horário";
    }
  }

  return null;
}
