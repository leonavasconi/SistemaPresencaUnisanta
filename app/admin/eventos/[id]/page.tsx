import Link from "next/link";
import { QrCode, Download, Users, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { TagSelect } from "@/components/ui/TagSelect";
import { formatDateTimeBR } from "@/lib/datetime";
import { updateEventAudience } from "../actions";

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
    .select("id, nome, descricao, inicio_em, fim_em, raio_metros, cursos_alvo, salas_alvo")
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

  const { data: alunos } = await supabase.from("alunos").select("curso, sala");
  const isString = (v: string | null): v is string => Boolean(v);
  const cursoOptions = [...new Set((alunos ?? []).map((a) => a.curso).filter(isString))].sort();
  const salaOptions = [...new Set((alunos ?? []).map((a) => a.sala).filter(isString))].sort();

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
            ? `${formatDateTimeBR(new Date(event.inicio_em))} — ${formatDateTimeBR(new Date(event.fim_em))}`
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

      {error && (
        <p className="max-w-2xl rounded-xl bg-red-50 px-3 py-2 text-sm text-unisanta-red">{error}</p>
      )}

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

      <Card className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="font-medium text-zinc-800">Público-alvo</h2>
          <p className="text-sm text-zinc-500">
            Cursos e/ou salas que veem este evento na tela &quot;Eventos&quot;. Sem nenhuma
            seleção, o evento aparece para todos os alunos.
          </p>
        </div>
        <form action={updateEventAudience.bind(null, eventId)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Cursos</Label>
            <TagSelect
              name="cursosAlvo"
              options={cursoOptions}
              placeholder="Digite um curso e adicione"
              defaultSelected={event?.cursos_alvo ?? []}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Salas</Label>
            <TagSelect
              name="salasAlvo"
              options={salaOptions}
              placeholder="Digite uma sala e adicione"
              defaultSelected={event?.salas_alvo ?? []}
            />
          </div>
          <Button type="submit" variant="secondary" className="w-full sm:w-fit">
            <Save className="h-4 w-4" />
            Salvar público-alvo
          </Button>
        </form>
      </Card>

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
                    {formatDateTimeBR(new Date(r.registrado_em))}
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
