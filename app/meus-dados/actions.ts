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
  // `participantes` é mantido (anonimizado) para que o histórico de presenças
  // continue íntegro para fins de auditoria (3.6.c da especificação),
  // conforme a LGPD permite quando há finalidade legítima de retenção.
  //
  // RA e curso agora são anuláveis, então podem ser de fato apagados em vez
  // de substituídos por um valor de fachada. `excluido_em` é o que libera a
  // constraint que exigiria esses campos de um aluno da Unisanta.
  await supabase
    .from("participantes")
    .update({
      nome_completo: "Participante removido",
      matricula: null,
      curso: null,
      sala: null,
      instituicao: null,
      descritor_facial: [],
      excluido_em: new Date().toISOString(),
    })
    .eq("id", user.id);

  await supabase.from("logs_consentimento").insert({
    participante_id: user.id,
    versao_consentimento: "n/a",
    acao: "revogado",
  });

  await supabase.auth.signOut();
  redirect("/");
}
