"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseEmail } from "@/lib/validation/email";
import { traduzErroAuth, validatePassword } from "@/lib/auth/errors";

function falhou(mensagem: string): never {
  redirect(`/criar-conta?error=${encodeURIComponent(mensagem)}`);
}

export async function signUp(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName) falhou("Informe seu nome completo.");

  const { email, error: emailError } = parseEmail(formData.get("email"));
  if (emailError) falhou(emailError);

  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");

  if (password !== passwordConfirmation) {
    falhou("As senhas não coincidem.");
  }

  const passwordError = validatePassword(password);
  if (passwordError) falhou(passwordError);

  // O checkbox só chega no FormData quando está marcado.
  const isUnisantaStudent = formData.get("alunoUnisanta") != null;

  // RA e curso só são exigidos de quem se declarou aluno da Unisanta —
  // participantes externos concluem o cadastro sem dados acadêmicos.
  const ra = String(formData.get("ra") ?? "").trim();
  const course = String(formData.get("course") ?? "").trim();

  if (isUnisantaStudent && !ra) falhou("Informe seu RA.");
  if (isUnisantaStudent && !course) falhou("Informe seu curso.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    falhou(traduzErroAuth(error?.message, "Não foi possível criar a conta."));
  }

  // Quando a confirmação de e-mail está ligada no Supabase, um cadastro em
  // e-mail já existente devolve sucesso com `identities` vazio, de propósito,
  // para não revelar quem tem conta. Tratamos como duplicidade.
  if (data.user.identities?.length === 0) {
    falhou("Já existe uma conta com este e-mail. Tente entrar ou recuperar sua senha.");
  }

  // Sem sessão, o insert abaixo cairia na RLS (`auth.uid() = id`). Isso
  // acontece quando a confirmação de e-mail está ativada no projeto Supabase.
  if (!data.session) {
    redirect(
      `/entrar?mensagem=${encodeURIComponent(
        "Conta criada. Confirme seu e-mail pelo link que enviamos e entre para concluir o cadastro.",
      )}`,
    );
  }

  const { error: participanteError } = await supabase.from("participantes").insert({
    id: data.user.id,
    nome_completo: fullName,
    aluno_unisanta: isUnisantaStudent,
    instituicao: isUnisantaStudent ? "Unisanta" : null,
    matricula: isUnisantaStudent ? ra : null,
    curso: isUnisantaStudent ? course : null,
    // `sala` deixou de ser perguntada no cadastro. A coluna continua no banco
    // e os registros antigos mantêm o valor — o filtro de eventos por turma
    // (lib/audience.ts) segue valendo para quem já a tem.
    descritor_facial: [],
  });

  if (participanteError) {
    // 23505 = unique violation. O único unique que o usuário consegue
    // esbarrar aqui é o do RA (a PK vem do id da conta recém-criada).
    const message =
      participanteError.code === "23505"
        ? "Este RA já está cadastrado em outra conta."
        : participanteError.message;
    falhou(message);
  }

  redirect("/cadastro");
}
