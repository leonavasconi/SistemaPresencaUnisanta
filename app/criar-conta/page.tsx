import Link from "next/link";
import { Mail, Lock, UserPlus } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { signUp } from "./actions";

export default async function CriarContaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthCard title="Criar conta de aluno" subtitle="Cadastre-se para registrar presença nos eventos">
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-unisanta-red">
          {error}
        </p>
      )}

      <form action={signUp} className="flex flex-col gap-3">
        <Input name="fullName" required placeholder="Nome completo" />
        <Input name="institution" required defaultValue="Unisanta" placeholder="Instituição" />
        <Input name="ra" required placeholder="RA" />
        <Input name="course" required placeholder="Curso" />
        <Input name="sala" placeholder="Sala/turma (opcional)" />
        <Input icon={Mail} name="email" type="email" required placeholder="E-mail institucional" />
        <Input icon={Lock} name="password" type="password" required minLength={6} placeholder="Crie uma senha" />
        <Button type="submit" variant="primary" className="w-full">
          <UserPlus className="h-4 w-4" />
          Criar conta
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-500">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-unisanta-navy hover:underline">
          Entrar
        </Link>
      </p>
    </AuthCard>
  );
}
