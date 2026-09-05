import { AuthCard } from "@/components/AuthCard";
import { Alert } from "@/components/ui/Alert";
import { createClient } from "@/lib/supabase/server";
import { RecuperarSessaoDoLink } from "./RecuperarSessaoDoLink";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sem sessão, ainda não é hora de desistir: o link de recuperação traz os
  // tokens no fragmento da URL, que só o navegador enxerga. Quem decide se o
  // link presta é o componente cliente abaixo — ele recolhe a sessão e
  // recarrega esta página, ou mostra que o link não vale mais.
  if (!user) {
    return (
      <AuthCard title="Redefinir senha">
        <RecuperarSessaoDoLink />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Criar nova senha" subtitle={`Definindo a senha de ${user.email}`}>
      {error && <Alert>{error}</Alert>}

      <ResetPasswordForm />
    </AuthCard>
  );
}
