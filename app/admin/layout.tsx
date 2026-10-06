import Image from "next/image";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
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
        <Link href="/admin/events" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 shadow-sm">
            <Image src="/logo-unisanta-marca.png" alt="Unisanta" width={26} height={26} />
          </div>
          <span className="font-semibold tracking-tight">Presença - Painel do Administrador</span>
        </Link>
        {user && (
          <form action={signOutAdmin} className="flex items-center gap-4">
            <span className="hidden text-sm text-zinc-300 sm:inline">{user.email}</span>
            <SignOutButton className="text-sm" />
          </form>
        )}
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
