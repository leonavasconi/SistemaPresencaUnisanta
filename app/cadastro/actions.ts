"use server";

import { createClient } from "@/lib/supabase/server";
import { CONSENT_VERSION } from "@/lib/consent";

export type EnrollmentInput = {
  descriptor: number[];
};

export async function saveEnrollment(input: EnrollmentInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const now = new Date().toISOString();
  const ip = null; // capturado pelo proxy/edge no futuro, se necessário

  const { data: participanteAtual, error: participanteFetchError } = await supabase
    .from("participantes")
    .select("aluno_unisanta, matricula, curso, instituicao")
    .eq("id", user.id)
    .maybeSingle();

  if (participanteFetchError) {
    return { error: participanteFetchError.message };
  }

  const alunoUnisantaValido = Boolean(
    participanteAtual?.aluno_unisanta && participanteAtual?.matricula && participanteAtual?.curso,
  );

  const { error: participanteError } = await supabase
    .from("participantes")
    .update({
      descritor_facial: input.descriptor,
      consentimento_em: now,
      versao_consentimento: CONSENT_VERSION,
      aluno_unisanta: alunoUnisantaValido,
      instituicao: alunoUnisantaValido ? participanteAtual?.instituicao ?? "Unisanta" : null,
      matricula: alunoUnisantaValido ? participanteAtual?.matricula ?? null : null,
      curso: alunoUnisantaValido ? participanteAtual?.curso ?? null : null,
      // Refazer o cadastro reativa a conta para quem tinha pedido exclusão —
      // sem isso, `excluido_em` nunca se apaga e a pessoa fica presa num
      // loop de redirecionamento de volta para esta mesma tela.
      excluido_em: null,
    })
    .eq("id", user.id);

  if (participanteError) {
    return { error: participanteError.message };
  }

  await supabase.from("logs_consentimento").insert({
    participante_id: user.id,
    versao_consentimento: CONSENT_VERSION,
    acao: "concedido",
    endereco_ip: ip,
  });

  return { error: null };
}
