import { AuthCard } from "@/components/AuthCard";
import { adminSignIn } from "./actions";

const inputClass =
  "h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-unisanta-navy focus:ring-1 focus:ring-unisanta-navy";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthCard title="Painel do administrador" subtitle="Gestão de eventos e presença">
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-unisanta-red">
          {error}
        </p>
      )}

      <form action={adminSignIn} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail"
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Senha"
          className={inputClass}
        />
        <button
          type="submit"
          className="h-11 rounded-lg bg-unisanta-navy font-medium text-white transition-colors hover:bg-unisanta-navy-dark"
        >
          Entrar
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-zinc-400">
        Contas de administrador são criadas pela equipe de TI da Unisanta.
      </p>
    </AuthCard>
  );
}
