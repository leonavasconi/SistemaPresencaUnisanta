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

  const { error: studentError } = await supabase
    .from("alunos")
    .update({
      descritor_facial: input.descriptor,
      consentimento_em: now,
      versao_consentimento: CONSENT_VERSION,
    })
    .eq("id", user.id);

  if (studentError) {
    return { error: studentError.message };
  }

  await supabase.from("logs_consentimento").insert({
    aluno_id: user.id,
    versao_consentimento: CONSENT_VERSION,
    acao: "concedido",
    endereco_ip: ip,
  });

  return { error: null };
}
