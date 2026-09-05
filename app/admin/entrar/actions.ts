"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseEmail } from "@/lib/validation/email";
import { traduzErroAuth } from "@/lib/auth/errors";

function falhou(mensagem: string): never {
  redirect(`/admin/entrar?error=${encodeURIComponent(mensagem)}`);
}

export async function adminSignIn(formData: FormData) {
  const { email, error: emailError } = parseEmail(formData.get("email"));
  if (emailError) falhou(emailError);

  const password = String(formData.get("password") ?? "");
  if (!password) falhou("Informe sua senha.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    falhou(traduzErroAuth(error?.message, "E-mail ou senha incorretos."));
  }

  const { data: profile } = await supabase
    .from("perfis")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    falhou("Esta conta não tem acesso ao painel de administrador.");
  }

  redirect("/admin/events");
}
