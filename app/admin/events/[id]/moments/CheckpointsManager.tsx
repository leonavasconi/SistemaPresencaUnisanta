"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CheckpointsEditor } from "../../_components/CheckpointsEditor";
import {
  computeDefaultCheckpoints,
  validateCheckpointsSchedule,
  validateLockedCheckpoints,
  type CheckpointDraft,
} from "@/lib/checkpoints";

export function CheckpointsManager({
  title,
  description,
  initialCheckpoints,
  eventStartsAt,
  eventEndsAt,
  qrByCheckpointId,
  lockedCheckpoints,
  action,
}: {
  title: string;
  description: string;
  initialCheckpoints: CheckpointDraft[];
  eventStartsAt: string;
  eventEndsAt: string;
  qrByCheckpointId?: Record<string, { qrDataUrl: string }>;
  /** Momentos que já têm presença registrada — não podem ter horário mudado nem ser removidos. */
  lockedCheckpoints?: (CheckpointDraft & { id: string })[];
  action: (formData: FormData) => void;
}) {
  const [checkpoints, setCheckpoints] = useState<CheckpointDraft[]>(initialCheckpoints);
  const checkpointsError = validateCheckpointsSchedule(checkpoints, eventStartsAt, eventEndsAt);
  const lockedError = validateLockedCheckpoints(checkpoints, lockedCheckpoints ?? []);
  const lockedCheckpointIds = useMemo(
    () => new Set((lockedCheckpoints ?? []).map((cp) => cp.id)),
    [lockedCheckpoints],
  );
  const hasLockedCheckpoints = Boolean(lockedCheckpoints?.length);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-medium text-zinc-800">{title}</h2>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setCheckpoints(computeDefaultCheckpoints(eventStartsAt, eventEndsAt))}
          disabled={hasLockedCheckpoints}
          title={
            hasLockedCheckpoints
              ? "Já existem momentos com presença registrada — sugerir de novo os apagaria da lista."
              : undefined
          }
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-unisanta-navy/40 hover:text-unisanta-navy disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-zinc-200 disabled:hover:text-zinc-600"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Sugerir horários a partir do início/fim
        </button>
      </div>
      <CheckpointsEditor
        value={checkpoints}
        onChange={setCheckpoints}
        qrByCheckpointId={qrByCheckpointId}
        lockedCheckpointIds={lockedCheckpointIds}
      />
      {(checkpointsError || lockedError) && (
        <p className="text-xs text-unisanta-red">{checkpointsError ?? lockedError}</p>
      )}
      <Button
        type="submit"
        className="w-full sm:w-fit sm:self-end"
        disabled={Boolean(checkpointsError) || Boolean(lockedError)}
      >
        <Save className="h-4 w-4" />
        Salvar momentos
      </Button>
    </form>
  );
}
