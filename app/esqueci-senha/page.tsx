import Link from "next/link";
import { Mail, Send, MailCheck, ArrowLeft } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Alert } from "@/components/ui/Alert";
import { Input, Label } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requestPasswordReset } from "./actions";

export default async function EsqueciSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; enviado?: string }>;
}) {
  const { error, enviado } = await searchParams;

  if (enviado) {
    return (
      <AuthCard title="Verifique seu e-mail" subtitle="Enviamos o link de redefinição.">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <MailCheck className="h-7 w-7 text-emerald-600" />
          </div>
          <p className="text-sm leading-relaxed text-zinc-600">
            Se houver uma conta com esse e-mail, enviamos um link para redefinir a
            senha. O link vale por tempo limitado e só pode ser usado uma vez.
          </p>
          <p className="text-xs text-zinc-400">
            Não recebeu? Confira a caixa de spam ou peça um novo link.
          </p>
          <Link
            href="/entrar"
            className="mt-1 flex items-center gap-1.5 text-sm font-medium text-unisanta-navy underline-offset-4 transition-colors hover:text-unisanta-navy-light hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para o login
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Esqueci minha senha"
      subtitle="Informe seu e-mail e enviaremos um link para criar uma nova senha."
    >
      {error && <Alert>{error}</Alert>}

      <form action={requestPasswordReset} className="flex flex-col gap-5">
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
            placeholder="nome@dominio.com"
          />
        </div>

        <SubmitButton className="w-full">
          <Send className="h-4 w-4" />
          Enviar link de redefinição
        </SubmitButton>
      </form>

      <p className="mt-6 border-t border-zinc-100 pt-5 text-center text-sm text-zinc-500">
        Lembrou a senha?{" "}
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
