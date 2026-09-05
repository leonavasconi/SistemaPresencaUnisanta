import { ShieldAlert } from "lucide-react";
import { ParticipantHeader } from "@/components/ParticipantHeader";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui/Card";
import { formatDateTimeBR } from "@/lib/datetime";
import { DeleteDataButton } from "./DeleteDataButton";

export default async function MeusDadosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: participant } = await supabase
    .from("participantes")
    .select(
      "nome_completo, aluno_unisanta, instituicao, matricula, curso, sala, consentimento_em, versao_consentimento",
    )
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const isUnisantaStudent = !!participant?.aluno_unisanta;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <ParticipantHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
        <PageHeader title="Meus dados" subtitle="Seus dados pessoais e direitos sob a LGPD" />

        <Card className="max-w-lg p-6">
          <dl className="flex flex-col gap-3 text-sm">
            <Row label="Nome completo" value={participant?.nome_completo} />
            <Row label="E-mail" value={user?.email} />
            <Row label="Aluno Unisanta" value={isUnisantaStudent ? "Sim" : "Não"} />

            {/* Dados acadêmicos só existem para alunos da Unisanta — para os
                demais participantes, exibir as linhas vazias só confundiria. */}
            {isUnisantaStudent && (
              <>
                <Row label="Instituição" value={participant?.instituicao} />
                <Row label="RA" value={participant?.matricula} />
                <Row label="Curso" value={participant?.curso} />
                {/* A sala deixou de ser perguntada no cadastro; a linha só
                    aparece para quem já tinha o dado registrado. */}
                {participant?.sala && <Row label="Sala/turma" value={participant.sala} />}
              </>
            )}

            <Row
              label="Consentimento LGPD"
              value={
                participant?.consentimento_em
                  ? `Aceito em ${formatDateTimeBR(new Date(participant.consentimento_em))} (versão ${participant.versao_consentimento})`
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
            Isso apagará seu nome, seus dados acadêmicos e o rosto cadastrado — o
            histórico de presenças é mantido de forma anônima para fins de auditoria.
          </p>
          <div className="mt-4">
            <DeleteDataButton />
          </div>
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
