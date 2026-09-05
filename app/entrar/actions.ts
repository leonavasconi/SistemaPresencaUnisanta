"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseEmail } from "@/lib/validation/email";
import { traduzErroAuth } from "@/lib/auth/errors";

function falhou(mensagem: string): never {
  redirect(`/entrar?error=${encodeURIComponent(mensagem)}`);
}

export async function signIn(formData: FormData) {
  const { email, error: emailError } = parseEmail(formData.get("email"));
  if (emailError) falhou(emailError);

  const password = String(formData.get("password") ?? "");
  if (!password) falhou("Informe sua senha.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    falhou(traduzErroAuth(error?.message, "E-mail ou senha incorretos."));
  }

  // A separação entre os dois acessos não é só visual: uma conta de
  // administrador não entra pela porta do participante, mesmo com a senha
  // certa. Sem isso, um admin logado aqui cairia em /cadastro e passaria pelo
  // middleware das rotas de participante como se fosse um.
  const { data: profile } = await supabase
    .from("perfis")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile) {
    await supabase.auth.signOut();
    falhou("Esta é uma conta de administrador. Use o acesso do painel administrativo.");
  }

  redirect("/cadastro");
}
