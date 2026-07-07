import { StudentHeader } from "@/components/StudentHeader";
import { createClient } from "@/lib/supabase/server";
import { deleteMyData } from "./actions";

export default async function MeusDadosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("full_name, institution, matricula, course, consent_at, consent_version")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <StudentHeader />
      <main className="flex flex-1 flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold text-unisanta-navy">Meus dados</h1>

        <div className="max-w-lg rounded-xl bg-white p-6 ring-1 ring-zinc-100">
          <dl className="flex flex-col gap-3 text-sm">
            <Row label="Nome completo" value={student?.full_name} />
            <Row label="Instituição" value={student?.institution} />
            <Row label="Matrícula" value={student?.matricula} />
            <Row label="Curso" value={student?.course} />
            <Row label="E-mail" value={user?.email} />
            <Row
              label="Consentimento LGPD"
              value={
                student?.consent_at
                  ? `Aceito em ${new Date(student.consent_at).toLocaleString("pt-BR")} (versão ${student.consent_version})`
                  : "Não registrado"
              }
            />
          </dl>
        </div>

        <div className="max-w-lg rounded-xl bg-red-50 p-6 ring-1 ring-red-100">
          <h2 className="font-medium text-unisanta-red">Excluir meus dados</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Você pode revogar seu consentimento e solicitar a exclusão dos seus dados
            pessoais e da sua biometria facial a qualquer momento, conforme a LGPD.
            Isso apagará seu nome, matrícula, curso e rosto cadastrado — o histórico de
            presenças é mantido de forma anônima para fins de auditoria.
          </p>
          <form action={deleteMyData} className="mt-4">
            <button
              type="submit"
              className="rounded-lg bg-unisanta-red px-4 py-2 text-sm font-medium text-white hover:bg-unisanta-red-dark"
            >
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
    <div className="flex justify-between gap-4 border-b border-zinc-100 pb-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-800">{value ?? "—"}</dd>
    </div>
  );
}
