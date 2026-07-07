"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function adminSignIn(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect(`/admin/entrar?error=${encodeURIComponent(error?.message ?? "Credenciais inválidas")}`);
  }

  const { data: profile } = await supabase
    .from("perfis")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    redirect(`/admin/entrar?error=${encodeURIComponent("Esta conta não tem acesso ao painel de administrador")}`);
  }

  redirect("/admin/eventos");
}
