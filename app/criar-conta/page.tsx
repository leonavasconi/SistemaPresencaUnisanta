import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { Alert } from "@/components/ui/Alert";
import { SignUpForm } from "./SignUpForm";

export default async function CriarContaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthCard
      title="Criar sua conta"
      subtitle="Cadastre-se para confirmar sua presença nos eventos."
      wide
    >
      {error && <Alert>{error}</Alert>}

      <SignUpForm />

      <p className="mt-6 border-t border-zinc-100 pt-5 text-center text-sm text-zinc-500">
        Já possui uma conta?{" "}
        <Link
          href="/entrar"
          className="font-medium text-unisanta-navy underline-offset-4 transition-colors hover:text-unisanta-navy-light hover:underline"
        >
          Entrar
        </Link>
      </p>
    </AuthCard>
  );
}
