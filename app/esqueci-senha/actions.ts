"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseEmail } from "@/lib/validation/email";
import { traduzErroAuth } from "@/lib/auth/errors";

export async function requestPasswordReset(formData: FormData) {
  const { email, error: emailError } = parseEmail(formData.get("email"));
  if (emailError) {
    redirect(`/esqueci-senha?error=${encodeURIComponent(emailError)}`);
  }

  const headerList = await headers();
  const origin = `${headerList.get("x-forwarded-proto") ?? "http"}://${headerList.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirmar?proximo=/redefinir-senha`,
  });

  // Só erros de infraestrutura (rate limit, SMTP) são mostrados. "E-mail não
  // cadastrado" nunca é revelado: isso permitiria descobrir quem tem conta no
  // sistema testando endereços um a um. O Supabase segue a mesma política e
  // responde com sucesso para endereços inexistentes.
  if (error) {
    redirect(
      `/esqueci-senha?error=${encodeURIComponent(
        traduzErroAuth(error.message, "Não foi possível enviar o e-mail agora. Tente novamente."),
      )}`,
    );
  }

  redirect("/esqueci-senha?enviado=1");
}
