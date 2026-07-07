import Image from "next/image";
import Link from "next/link";
import { GraduationCap, ShieldCheck, MapPin, ScanFace } from "lucide-react";
import { PageBackground } from "@/components/ui/PageBackground";

const FEATURES = [
  { icon: MapPin, label: "Confere sua localização" },
  { icon: ScanFace, label: "Confirma seu rosto" },
  { icon: ShieldCheck, label: "Protege seus dados (LGPD)" },
];

export default function Home() {
  return (
    <PageBackground>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-md flex-col items-center gap-8 rounded-3xl border border-zinc-100 bg-white/90 p-10 text-center shadow-xl shadow-zinc-900/5 backdrop-blur-sm">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-white to-zinc-50 shadow-sm ring-1 ring-zinc-100">
            <Image src="/logo-unisanta.png" alt="Unisanta" width={68} height={68} priority />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-unisanta-navy">
              Unisanta Presença
            </h1>
            <p className="text-sm text-zinc-500">
              Registro de presença em eventos por localização e biometria facial
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-2 border-y border-zinc-100 py-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Icon className="h-3.5 w-3.5 text-unisanta-navy" />
                {label}
              </div>
            ))}
          </div>

          <div className="flex w-full flex-col gap-3">
            <Link
              href="/entrar"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-unisanta-red to-unisanta-red-dark font-medium text-white shadow-sm shadow-red-900/20 transition-all hover:brightness-110 active:brightness-95"
            >
              <GraduationCap className="h-4.5 w-4.5" />
              Sou aluno
            </Link>
            <Link
              href="/admin/entrar"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-unisanta-navy/30 bg-white font-medium text-unisanta-navy transition-colors hover:bg-unisanta-navy hover:text-white hover:border-unisanta-navy"
            >
              <ShieldCheck className="h-4.5 w-4.5" />
              Sou administrador
            </Link>
          </div>
        </div>
      </div>
    </PageBackground>
  );
}
