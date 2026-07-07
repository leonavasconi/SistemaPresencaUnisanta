import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOutAdmin } from "./actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between bg-gradient-to-r from-unisanta-navy to-unisanta-navy-dark px-6 py-3 text-white shadow-sm">
        <Link href="/admin/eventos" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 shadow-sm">
            <Image src="/logo-unisanta.png" alt="Unisanta" width={26} height={26} />
          </div>
          <span className="font-semibold tracking-tight">Presença — Painel do Administrador</span>
        </Link>
        {user && (
          <form action={signOutAdmin} className="flex items-center gap-4">
            <span className="hidden text-sm text-zinc-300 sm:inline">{user.email}</span>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-sm transition-colors hover:bg-white/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </form>
        )}
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">{children}</main>
    </div>
  );
}
