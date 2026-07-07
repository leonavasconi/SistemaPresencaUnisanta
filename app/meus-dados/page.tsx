import { ShieldAlert, Trash2 } from "lucide-react";
import { StudentHeader } from "@/components/StudentHeader";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui/Card";
import { formatDateTimeBR } from "@/lib/datetime";
import { deleteMyData } from "./actions";

export default async function MeusDadosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("alunos")
    .select("nome_completo, instituicao, matricula, curso, sala, consentimento_em, versao_consentimento")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <StudentHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
        <PageHeader title="Meus dados" subtitle="Seus dados pessoais e direitos sob a LGPD" />

        <Card className="max-w-lg p-6">
          <dl className="flex flex-col gap-3 text-sm">
            <Row label="Nome completo" value={student?.nome_completo} />
            <Row label="Instituição" value={student?.instituicao} />
            <Row label="Matrícula" value={student?.matricula} />
            <Row label="Curso" value={student?.curso} />
            <Row label="Sala/turma" value={student?.sala} />
            <Row label="E-mail" value={user?.email} />
            <Row
              label="Consentimento LGPD"
              value={
                student?.consentimento_em
                  ? `Aceito em ${formatDateTimeBR(new Date(student.consentimento_em))} (versão ${student.versao_consentimento})`
                  : "Não registrado"
              }
            />
          </dl>
        </Card>

        <div className="max-w-lg rounded-2xl border border-red-100 bg-red-50/60 p-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-unisanta-red" />
            <h2 className="font-medium text-unisanta-red">Excluir meus dados</h2>
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            Você pode revogar seu consentimento e solicitar a exclusão dos seus dados
            pessoais e da sua biometria facial a qualquer momento, conforme a LGPD.
            Isso apagará seu nome, matrícula, curso e rosto cadastrado — o histórico de
            presenças é mantido de forma anônima para fins de auditoria.
          </p>
          <form action={deleteMyData} className="mt-4">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-unisanta-red to-unisanta-red-dark px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-red-900/20 transition-all hover:brightness-110"
            >
              <Trash2 className="h-4 w-4" />
              Excluir meus dados e sair
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-800">{value ?? "—"}</dd>
    </div>
  );
}
