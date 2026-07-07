import { AuthCard } from "@/components/AuthCard";
import { signIn, signUp } from "./actions";

const inputClass =
  "h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-unisanta-navy focus:ring-1 focus:ring-unisanta-navy";

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthCard title="Área do aluno" subtitle="Entre para registrar sua presença nos eventos">
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-unisanta-red">
          {error}
        </p>
      )}

      <form action={signIn} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail institucional"
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Senha"
          className={inputClass}
        />
        <button
          type="submit"
          className="h-11 rounded-lg bg-unisanta-red font-medium text-white transition-colors hover:bg-unisanta-red-dark"
        >
          Entrar
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-zinc-400">
        <div className="h-px flex-1 bg-zinc-200" />
        ainda não tem conta?
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      <form action={signUp} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail institucional"
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Crie uma senha"
          className={inputClass}
        />
        <button
          type="submit"
          className="h-11 rounded-lg border border-unisanta-navy font-medium text-unisanta-navy transition-colors hover:bg-unisanta-navy hover:text-white"
        >
          Criar conta de aluno
        </button>
      </form>
    </AuthCard>
  );
}
