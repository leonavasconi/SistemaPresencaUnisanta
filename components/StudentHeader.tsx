import Image from "next/image";
import Link from "next/link";
import { CalendarDays, CalendarCheck, UserCog, LogOut } from "lucide-react";
import { signOutStudent } from "@/app/actions";

export function StudentHeader() {
  return (
    <header className="flex items-center justify-between bg-gradient-to-r from-unisanta-navy to-unisanta-navy-dark px-6 py-3 text-white shadow-sm">
      <Link href="/eventos" className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 shadow-sm">
          <Image src="/logo-unisanta.png" alt="Unisanta" width={24} height={24} />
        </div>
        <span className="hidden font-semibold tracking-tight sm:inline">Unisanta Presença</span>
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        <Link
          href="/eventos"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-white/10"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Eventos</span>
        </Link>
        <Link
          href="/minhas-presencas"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-white/10"
        >
          <CalendarCheck className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Minhas presenças</span>
        </Link>
        <Link
          href="/meus-dados"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-white/10"
        >
          <UserCog className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Meus dados</span>
        </Link>
        <form action={signOutStudent}>
          <button
            type="submit"
            className="ml-1 flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 transition-colors hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </form>
      </nav>
    </header>
  );
}
