"use client";

import { useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CheckpointsEditor } from "../../_components/CheckpointsEditor";
import {
  computeDefaultCheckpoints,
  validateCheckpointsSchedule,
  type CheckpointDraft,
} from "@/lib/checkpoints";

export function CheckpointsManager({
  title,
  description,
  initialCheckpoints,
  eventStartsAt,
  eventEndsAt,
  qrByCheckpointId,
  action,
}: {
  title: string;
  description: string;
  initialCheckpoints: CheckpointDraft[];
  eventStartsAt: string;
  eventEndsAt: string;
  qrByCheckpointId?: Record<string, { qrDataUrl: string }>;
  action: (formData: FormData) => void;
}) {
  const [checkpoints, setCheckpoints] = useState<CheckpointDraft[]>(initialCheckpoints);
  const checkpointsError = validateCheckpointsSchedule(checkpoints, eventStartsAt, eventEndsAt);

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
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-unisanta-navy/40 hover:text-unisanta-navy"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Sugerir horários a partir do início/fim
        </button>
      </div>
      <CheckpointsEditor
        value={checkpoints}
        onChange={setCheckpoints}
        qrByCheckpointId={qrByCheckpointId}
      />
      {checkpointsError && <p className="text-xs text-unisanta-red">{checkpointsError}</p>}
      <Button
        type="submit"
        className="w-full sm:w-fit sm:self-end"
        disabled={Boolean(checkpointsError)}
      >
        <Save className="h-4 w-4" />
        Salvar momentos
      </Button>
    </form>
  );
}
