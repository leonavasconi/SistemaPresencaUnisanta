export type CheckpointPreset = "encerramento" | "inicio_fim" | "inicio_meio_fim";

export const CHECKPOINT_PRESETS: {
  key: CheckpointPreset;
  title: string;
  description: string;
}[] = [
  {
    key: "encerramento",
    title: "Somente no encerramento",
    description: "1 momento — registra presença apenas no final do evento",
  },
  {
    key: "inicio_fim",
    title: "Início e encerramento",
    description: "2 momentos — entrada e saída",
  },
  {
    key: "inicio_meio_fim",
    title: "Início, meio e encerramento",
    description: "3 momentos ao longo do evento",
  },
];

export function computeCheckpointsForPreset(
  preset: CheckpointPreset,
  startsAt: Date,
  endsAt: Date,
): { label: string; opensAt: Date; closesAt: Date }[] {
  const durationMs = endsAt.getTime() - startsAt.getTime();
  const windowMs = Math.max(5 * 60 * 1000, Math.min(20 * 60 * 1000, durationMs / 6));

  const start = {
    label: "Entrada",
    opensAt: startsAt,
    closesAt: new Date(startsAt.getTime() + windowMs),
  };
  const end = {
    label: "Encerramento",
    opensAt: new Date(endsAt.getTime() - windowMs),
    closesAt: endsAt,
  };
  const midPoint = startsAt.getTime() + durationMs / 2;
  const middle = {
    label: "Meio do evento",
    opensAt: new Date(midPoint - windowMs / 2),
    closesAt: new Date(midPoint + windowMs / 2),
  };

  switch (preset) {
    case "encerramento":
      return [end];
    case "inicio_fim":
      return [start, end];
    case "inicio_meio_fim":
      return [start, middle, end];
  }
}
