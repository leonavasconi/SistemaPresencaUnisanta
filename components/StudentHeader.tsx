import Image from "next/image";
import Link from "next/link";
import { signOutStudent } from "@/app/actions";

export function StudentHeader() {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-unisanta-navy px-6 py-3 text-white">
      <Link href="/minhas-presencas" className="flex items-center gap-3">
        <Image src="/logo-unisanta.png" alt="Unisanta" width={32} height={32} />
        <span className="font-semibold tracking-tight">Unisanta Presença</span>
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/minhas-presencas" className="hover:underline">
          Minhas presenças
        </Link>
        <Link href="/meus-dados" className="hover:underline">
          Meus dados
        </Link>
        <form action={signOutStudent}>
          <button type="submit" className="rounded-lg border border-white/30 px-3 py-1.5 transition-colors hover:bg-white/10">
            Sair
          </button>
        </form>
      </nav>
    </header>
  );
}
