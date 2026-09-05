"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { traduzErroAuth, validatePassword } from "@/lib/auth/errors";

function falhou(mensagem: string): never {
  redirect(`/redefinir-senha?error=${encodeURIComponent(mensagem)}`);
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");

  if (password !== passwordConfirmation) falhou("As senhas não coincidem.");

  const passwordError = validatePassword(password);
  if (passwordError) falhou(passwordError);

  const supabase = await createClient();

  // A sessão aqui é a que o link de e-mail criou em /auth/confirmar. Sem ela
  // não há o que redefinir — é o caso de link expirado, já usado, ou aberto
  // num navegador diferente daquele que pediu a redefinição.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/esqueci-senha?error=${encodeURIComponent(
        "Sua sessão de redefinição expirou. Peça um novo link.",
      )}`,
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    falhou(traduzErroAuth(error.message, "Não foi possível alterar a senha. Tente novamente."));
  }

  // Descobre para onde mandar antes de encerrar a sessão.
  const { data: profile } = await supabase
    .from("perfis")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const destino = profile ? "/admin/entrar" : "/entrar";

  // Encerra a sessão temporária criada pelo link: a partir daqui o acesso é
  // pela senha nova, o que também invalida o link de recuperação já usado.
  await supabase.auth.signOut();

  redirect(
    `${destino}?mensagem=${encodeURIComponent("Senha alterada. Entre com sua nova senha.")}`,
  );
}
