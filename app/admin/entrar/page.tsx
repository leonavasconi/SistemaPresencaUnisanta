import Link from "next/link";
import { Mail, LogIn } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Alert } from "@/components/ui/Alert";
import { Input, Label } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { emailDeLoginLembrado } from "@/lib/auth/login-email";
import { adminSignIn } from "./actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mensagem?: string }>;
}) {
  const { error, mensagem } = await searchParams;
  // Depois de um login que falhou, o e-mail volta preenchido e só a senha em branco.
  const email = await emailDeLoginLembrado();

  return (
    <AuthCard
      title="Painel do administrador"
      subtitle="Gestão de eventos e presença."
      badges={false}
    >
      {error && <Alert>{error}</Alert>}
      {mensagem && <Alert variant="success">{mensagem}</Alert>}

      <form action={adminSignIn} className="flex flex-col gap-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" required>
              E-mail
            </Label>
            <Input
              id="email"
              icon={Mail}
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={email}
              placeholder="nome@dominio.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="password" required>
                Senha
              </Label>
              <Link
                href="/esqueci-senha"
                className="text-xs font-medium text-unisanta-navy underline-offset-4 transition-colors hover:text-unisanta-navy-light hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="current-password"
              // E-mail já preenchido: quem errou só precisa digitar a senha de novo.
              autoFocus={email !== ""}
              placeholder="Sua senha"
            />
          </div>
        </div>

        <SubmitButton variant="secondary" className="w-full">
          <LogIn className="h-4 w-4" />
          Entrar
        </SubmitButton>
      </form>

      <p className="mt-6 border-t border-zinc-100 pt-5 text-center text-xs text-zinc-400">
        Contas de administrador são criadas pela equipe de TI da Unisanta.
      </p>
    </AuthCard>
  );
}
