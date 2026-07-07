import Image from "next/image";
import { PageBackground } from "./ui/PageBackground";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <PageBackground>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl border border-zinc-100 bg-white/90 p-8 shadow-xl shadow-zinc-900/5 backdrop-blur-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-zinc-50 shadow-sm ring-1 ring-zinc-100">
            <Image src="/logo-unisanta.png" alt="Unisanta" width={56} height={56} />
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-unisanta-navy">
              {title}
            </h1>
            {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
          </div>
          <div className="w-full">{children}</div>
        </div>
      </div>
    </PageBackground>
  );
}
