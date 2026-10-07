"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { apagarCrachaDeAcesso } from "@/lib/supabase/acesso-cache-server";
import { getSessionUser } from "@/lib/supabase/auth";
import { CONSENT_VERSION } from "@/lib/consent";

const DESCRIPTOR_LENGTH = 128;

/**
 * Regrava o rosto cadastrado, sem tocar em mais nada do cadastro.
 *
 * Existe porque o descritor guardado no cadastro e o capturado no check-in
 * podem ter sido feitos em condições muito diferentes — cadastro em casa com
 * boa luz, check-in num auditório escuro, de outro aparelho. Quando isso
 * acontece, a comparação nunca fecha e a pessoa fica travada por mais que
 * tente. Recapturar no próprio local do evento alinha as duas pontas.
 *
 * Diferente de `saveEnrollment` (usado no cadastro inicial), aqui só o
 * descritor muda: consentimento, dados acadêmicos e situação da conta ficam
 * como estão. A coleta em si é registrada em `logs_consentimento`, porque é
 * uma nova captura de dado biométrico.
 */
export async function updateFaceDescriptor(descriptor: number[]) {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (!user) {
    return { error: "Sua sessão expirou. Faça login novamente." };
  }

  if (
    !Array.isArray(descriptor) ||
    descriptor.length !== DESCRIPTOR_LENGTH ||
    descriptor.some((n) => typeof n !== "number" || !Number.isFinite(n))
  ) {
    return { error: "A captura não ficou boa. Tente novamente." };
  }

  const { error } = await supabase
    .from("participantes")
    .update({ descritor_facial: descriptor })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("logs_consentimento").insert({
    participante_id: user.id,
    versao_consentimento: CONSENT_VERSION,
    acao: "concedido",
  });

  return { error: null };
}

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
      aluno_unisanta: false,
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

  // O estado mudou (volta a exigir cadastro): o crachá de acesso não vale mais.
  await apagarCrachaDeAcesso();
  await supabase.auth.signOut();
  redirect("/");
}
