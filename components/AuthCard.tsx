import Image from "next/image";

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
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-100">
        <Image src="/logo-unisanta.png" alt="Unisanta" width={72} height={72} />
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-unisanta-navy">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
        </div>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
