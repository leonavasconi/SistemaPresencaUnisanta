"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { apagarCrachaDeAcesso } from "@/lib/supabase/acesso-cache-server";
import { parseEmail } from "@/lib/validation/email";
import { traduzErroAuth } from "@/lib/auth/errors";
import { esquecerEmailDeLogin, lembrarEmailDeLogin } from "@/lib/auth/login-email";

function falhou(mensagem: string): never {
  redirect(`/admin/entrar?error=${encodeURIComponent(mensagem)}`);
}

export async function adminSignIn(formData: FormData) {
  // Guardado antes de qualquer validação: se algo falhar, a tela volta com o
  // e-mail preenchido e só a senha em branco.
  await lembrarEmailDeLogin(String(formData.get("email") ?? "").trim(), "/admin/entrar");

  const { email, error: emailError } = parseEmail(formData.get("email"));
  if (emailError) falhou(emailError);

  const password = String(formData.get("password") ?? "");
  if (!password) falhou("Informe sua senha.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    falhou(traduzErroAuth(error?.message, "E-mail ou senha incorretos."));
  }

  // A sessão mudou: um crachá de acesso anterior (de outra conta, por exemplo)
  // não vale mais. Também cobre o ramo abaixo em que a conta é recusada e a
  // sessão é encerrada.
  await apagarCrachaDeAcesso();

  const { data: profile } = await supabase
    .from("perfis")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    falhou("Esta conta não tem acesso ao painel de administrador.");
  }

  await esquecerEmailDeLogin("/admin/entrar");
  redirect("/admin/events");
}
