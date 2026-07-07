import Link from "next/link";
import { QrCode, Download, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function EventDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("eventos")
    .select("id, nome, descricao, inicio_em, fim_em, raio_metros")
    .eq("id", eventId)
    .maybeSingle();

  const { data: checkpoints } = await supabase
    .from("momentos_presenca")
    .select("id, rotulo, ordem")
    .eq("evento_id", eventId)
    .order("ordem", { ascending: true });

  const { data: records } = await supabase
    .from("registros_presenca")
    .select("id, momento_id, registrado_em, distancia_m, situacao, alunos(nome_completo, matricula, curso)")
    .eq("evento_id", eventId)
    .order("registrado_em", { ascending: false });

  const countByCheckpoint = new Map<string, number>();
  for (const r of records ?? []) {
    countByCheckpoint.set(r.momento_id, (countByCheckpoint.get(r.momento_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={event?.nome ?? ""}
        subtitle={
          event
            ? `${new Date(event.inicio_em).toLocaleString("pt-BR")} — ${new Date(event.fim_em).toLocaleString("pt-BR")}`
            : undefined
        }
        action={
          <div className="flex gap-3">
            <Link href={`/admin/eventos/${eventId}/momentos`}>
              <Button variant="outline">
                <QrCode className="h-4 w-4" />
                Momentos / QR
              </Button>
            </Link>
            <a href={`/admin/eventos/${eventId}/exportar`}>
              <Button>
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            </a>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(checkpoints ?? []).map((cp) => (
          <Card key={cp.id} className="flex flex-col items-center gap-2 p-5 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-unisanta-navy/10 text-unisanta-navy">
              <Users className="h-4.5 w-4.5" />
            </div>
            <p className="text-2xl font-semibold text-unisanta-navy">
              {countByCheckpoint.get(cp.id) ?? 0}
            </p>
            <p className="text-xs text-zinc-500">{cp.rotulo}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Aluno</th>
              <th className="px-4 py-3">Matrícula</th>
              <th className="px-4 py-3">Momento</th>
              <th className="px-4 py-3">Registrado em</th>
              <th className="px-4 py-3">Distância</th>
            </tr>
          </thead>
          <tbody>
            {(records ?? []).map((r) => {
              const checkpoint = checkpoints?.find((c) => c.id === r.momento_id);
              const student = Array.isArray(r.alunos) ? r.alunos[0] : r.alunos;
              return (
                <tr key={r.id} className="border-t border-zinc-100 transition-colors hover:bg-zinc-50/70">
                  <td className="px-4 py-3 font-medium text-zinc-800">{student?.nome_completo}</td>
                  <td className="px-4 py-3 text-zinc-500">{student?.matricula}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-unisanta-navy/10 px-2.5 py-0.5 text-xs font-medium text-unisanta-navy">
                      {checkpoint?.rotulo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(r.registrado_em).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{Math.round(r.distancia_m)} m</td>
                </tr>
              );
            })}
            {(!records || records.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-400">
                  Nenhum registro de presença ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
