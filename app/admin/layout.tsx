import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOutAdmin } from "./actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-unisanta-navy px-6 py-3 text-white">
        <Link href="/admin/events" className="flex items-center gap-3">
          <Image src="/logo-unisanta.png" alt="Unisanta" width={36} height={36} />
          <span className="font-semibold tracking-tight">Presença — Painel do Administrador</span>
        </Link>
        {user && (
          <form action={signOutAdmin} className="flex items-center gap-4">
            <span className="text-sm text-zinc-200">{user.email}</span>
            <button
              type="submit"
              className="rounded-lg border border-white/30 px-3 py-1.5 text-sm transition-colors hover:bg-white/10"
            >
              Sair
            </button>
          </form>
        )}
      </header>
      <main className="flex flex-1 flex-col px-6 py-8">{children}</main>
    </div>
  );
}
