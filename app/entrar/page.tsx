import { Mail, Lock, LogIn, UserPlus } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { signIn, signUp } from "./actions";

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthCard title="Área do aluno" subtitle="Entre para registrar sua presença nos eventos">
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-unisanta-red">
          {error}
        </p>
      )}

      <form action={signIn} className="flex flex-col gap-3">
        <Input icon={Mail} name="email" type="email" required placeholder="E-mail institucional" />
        <Input icon={Lock} name="password" type="password" required minLength={6} placeholder="Senha" />
        <Button type="submit" variant="primary" className="w-full">
          <LogIn className="h-4 w-4" />
          Entrar
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-zinc-400">
        <div className="h-px flex-1 bg-zinc-200" />
        ainda não tem conta?
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      <form action={signUp} className="flex flex-col gap-3">
        <Input icon={Mail} name="email" type="email" required placeholder="E-mail institucional" />
        <Input icon={Lock} name="password" type="password" required minLength={6} placeholder="Crie uma senha" />
        <Button type="submit" variant="outline" className="w-full">
          <UserPlus className="h-4 w-4" />
          Criar conta de aluno
        </Button>
      </form>
    </AuthCard>
  );
}
