import { Download, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDateTimeBR, toDatetimeLocalValue } from "@/lib/datetime";
import { computeDefaultCheckpoints, type CheckpointDraft } from "@/lib/checkpoints";
import { syncCheckpoints } from "../actions";
import { CheckpointsManager } from "./moments/CheckpointsManager";

export default async function EventDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id: eventId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("eventos")
    .select("id, nome, descricao, inicio_em, fim_em, raio_metros")
    .eq("id", eventId)
    .maybeSingle();

  const { data: checkpoints } = await supabase
    .from("momentos_presenca")
    .select("id, rotulo, abre_em, fecha_em, ordem")
    .eq("evento_id", eventId)
    .order("ordem", { ascending: true });

  const { data: records } = await supabase
    .from("registros_presenca")
    .select("id, momento_id, registrado_em, situacao, alunos(nome_completo, matricula, curso)")
    .eq("evento_id", eventId)
    .order("registrado_em", { ascending: false });

  const countByCheckpoint = new Map<string, number>();
  for (const r of records ?? []) {
    countByCheckpoint.set(r.momento_id, (countByCheckpoint.get(r.momento_id) ?? 0) + 1);
  }

  const initialCheckpoints: CheckpointDraft[] =
    checkpoints && checkpoints.length > 0
      ? checkpoints.map((cp) => ({
          id: cp.id,
          opensAt: toDatetimeLocalValue(new Date(cp.abre_em)),
          closesAt: toDatetimeLocalValue(new Date(cp.fecha_em)),
        }))
      : computeDefaultCheckpoints(
          event ? toDatetimeLocalValue(new Date(event.inicio_em)) : "",
          event ? toDatetimeLocalValue(new Date(event.fim_em)) : "",
        );

  const syncCheckpointsForEvent = syncCheckpoints.bind(null, eventId, `/admin/events/${eventId}`);
  const eventStartsAt = event ? toDatetimeLocalValue(new Date(event.inicio_em)) : "";
  const eventEndsAt = event ? toDatetimeLocalValue(new Date(event.fim_em)) : "";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <PageHeader
        title={event?.nome ?? ""}
        subtitle={
          event
            ? `${formatDateTimeBR(new Date(event.inicio_em))} — ${formatDateTimeBR(new Date(event.fim_em))}`
            : undefined
        }
        action={
          <form
            action={`/admin/events/${eventId}/export`}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <select
              name="format"
              defaultValue="csv"
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-unisanta-navy focus:ring-2 focus:ring-unisanta-navy/15"
            >
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
            </select>
            <Button type="submit" className="w-full sm:w-auto">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </form>
        }
      />

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-unisanta-red">{error}</p>
      )}

      <Card className="flex flex-col divide-y divide-zinc-100">
        {(checkpoints ?? []).map((cp) => (
          <div key={cp.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-unisanta-navy/10 text-unisanta-navy">
                <Users className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-zinc-700">{cp.rotulo}</span>
            </div>
            <span className="text-sm font-semibold text-unisanta-navy">
              {countByCheckpoint.get(cp.id) ?? 0}
            </span>
          </div>
        ))}
        {(!checkpoints || checkpoints.length === 0) && (
          <p className="px-5 py-6 text-center text-sm text-zinc-400">Nenhum momento criado ainda.</p>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <CheckpointsManager
          title="Momentos de presença"
          description="Edite os horários, adicione ou remova momentos no meio do evento sem precisar sair desta tela."
          initialCheckpoints={initialCheckpoints}
          eventStartsAt={eventStartsAt}
          eventEndsAt={eventEndsAt}
          action={syncCheckpointsForEvent}
        />
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Participante</th>
                <th className="px-4 py-3">RA</th>
                <th className="px-4 py-3">Momento</th>
                <th className="px-4 py-3">Registrado em</th>
              </tr>
            </thead>
            <tbody>
              {(records ?? []).map((r) => {
                const checkpoint = checkpoints?.find((c) => c.id === r.momento_id);
                const participant = Array.isArray(r.alunos) ? r.alunos[0] : r.alunos;
                return (
                  <tr key={r.id} className="border-t border-zinc-100 transition-colors hover:bg-zinc-50/70">
                    <td className="px-4 py-3 font-medium text-zinc-800">{participant?.nome_completo}</td>
                    <td className="px-4 py-3 text-zinc-500">{participant?.matricula || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-unisanta-navy/10 px-2.5 py-0.5 text-xs font-medium text-unisanta-navy">
                        {checkpoint?.rotulo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {formatDateTimeBR(new Date(r.registrado_em))}
                    </td>
                  </tr>
                );
              })}
              {(!records || records.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-zinc-400">
                    Nenhum registro de presença ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
