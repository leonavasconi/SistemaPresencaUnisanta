import { Mail, Lock, LogIn } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { adminSignIn } from "./actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthCard title="Painel do administrador" subtitle="Gestão de eventos e presença">
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-unisanta-red">
          {error}
        </p>
      )}

      <form action={adminSignIn} className="flex flex-col gap-3">
        <Input icon={Mail} name="email" type="email" required placeholder="E-mail" />
        <Input icon={Lock} name="password" type="password" required placeholder="Senha" />
        <Button type="submit" variant="secondary" className="w-full">
          <LogIn className="h-4 w-4" />
          Entrar
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-zinc-400">
        Contas de administrador são criadas pela equipe de TI da Unisanta.
      </p>
    </AuthCard>
  );
}
