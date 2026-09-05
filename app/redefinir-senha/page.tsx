import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
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

  // Chegar aqui sem sessão significa link inválido, expirado ou já usado —
  // o formulário não deve nem aparecer nesse caso.
  if (!user) {
    return (
      <AuthCard title="Link inválido">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
          <p className="text-sm text-zinc-600">
            Este link de redefinição expirou, já foi usado ou foi aberto em outro
            navegador. Peça um novo para continuar.
          </p>
          <Link href="/esqueci-senha" className="w-full">
            <Button type="button" variant="primary" className="w-full">
              Pedir novo link
            </Button>
          </Link>
        </div>
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
