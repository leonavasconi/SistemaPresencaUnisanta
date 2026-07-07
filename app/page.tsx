import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="flex w-full max-w-md flex-col items-center gap-8 rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-zinc-100">
        <Image
          src="/logo-unisanta.png"
          alt="Unisanta"
          width={140}
          height={140}
          priority
        />

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-unisanta-navy">
            Unisanta Presença
          </h1>
          <p className="text-sm text-zinc-500">
            Registro de presença por localização e biometria facial
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-full bg-unisanta-red font-medium text-white transition-colors hover:bg-unisanta-red-dark"
          >
            Sou aluno
          </Link>
          <Link
            href="/admin/login"
            className="flex h-12 w-full items-center justify-center rounded-full border border-unisanta-navy font-medium text-unisanta-navy transition-colors hover:bg-unisanta-navy hover:text-white"
          >
            Sou administrador
          </Link>
        </div>
      </div>
    </div>
  );
}
