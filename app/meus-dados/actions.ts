"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function deleteMyData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  // Apaga dados pessoais e a biometria facial imediatamente. O registro em
  // `alunos` é mantido (anonimizado) para que o histórico de presenças
  // continue íntegro para fins de auditoria (3.6.c da especificação),
  // conforme a LGPD permite quando há finalidade legítima de retenção.
  await supabase
    .from("alunos")
    .update({
      nome_completo: "Aluno removido",
      matricula: `removido-${user!.id.slice(0, 8)}`,
      curso: "",
      descritor_facial: [],
      excluido_em: new Date().toISOString(),
    })
    .eq("id", user.id);

  await supabase.from("logs_consentimento").insert({
    aluno_id: user.id,
    versao_consentimento: "n/a",
    acao: "revogado",
  });

  await supabase.auth.signOut();
  redirect("/");
}
