import Image from "next/image";
import { TrustBadges } from "./TrustBadges";

/**
 * Layout das telas de autenticação: marca à esquerda, formulário à direita,
 * dentro de um container centralizado. O limite de largura existe para que em
 * monitores largos as duas colunas continuem se conversando, em vez de
 * escorregarem para cantos opostos da tela.
 *
 * O fundo é claro de propósito. O brasão da Unisanta é metade vermelho,
 * metade azul-marinho — sobre um painel escuro, o escudo e a palavra
 * "UNISANTA" somem, sobrando só os cavalos-marinhos.
 */
export function AuthCard({
  title,
  subtitle,
  badges = true,
  wide = false,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Os chips de localização/biometria/LGPD — desligue onde não fizerem sentido. */
  badges?: boolean;
  /** Card mais largo, para formulários que distribuem campos em duas colunas. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-full flex-1 flex-col overflow-hidden bg-zinc-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(ellipse_60%_50%_at_15%_0%,rgba(41,22,111,0.07),transparent_70%),radial-gradient(ellipse_50%_45%_at_95%_100%,rgba(218,37,28,0.05),transparent_65%)]"
      />

      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center justify-center gap-10 px-6 py-10 lg:flex-row lg:items-center lg:gap-12 lg:px-8 lg:py-8">
        {/* Coluna centrada como um bloco só: o brasão fica sobre o eixo do
            nome do sistema, em vez de encostado à esquerda dele. */}
        <aside className="flex w-full flex-col items-center gap-6 text-center lg:w-[44%] lg:gap-7">
          <Image
            src="/logo-unisanta-marca.png"
            alt="Unisanta"
            width={1294}
            height={1294}
            priority
            className="h-24 w-24 drop-shadow-sm sm:h-28 sm:w-28 lg:h-36 lg:w-36 xl:h-40 xl:w-40"
          />

          <div className="flex flex-col gap-3">
            <h2 className="text-3xl font-semibold tracking-tight text-unisanta-navy lg:text-[2.5rem] lg:leading-[1.1]">
              Sistema de Presença
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-zinc-600 lg:text-base">
              Registre sua participação em eventos de forma simples, segura e inteligente.
            </p>
          </div>

          {badges && <TrustBadges />}
        </aside>

        <main className="flex w-full justify-center lg:w-[56%] lg:justify-end">
          <div
            className={`w-full rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-lg shadow-zinc-900/[0.06] sm:p-7 ${
              wide ? "max-w-[620px]" : "max-w-[480px]"
            }`}
          >
            <div className="flex flex-col gap-2">
              {/* Régua curta na cor institucional: ancora o título sem pesar. */}
              <span aria-hidden className="h-1 w-10 rounded-full bg-unisanta-red" />
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
              {subtitle && <p className="text-sm leading-relaxed text-zinc-500">{subtitle}</p>}
            </div>
            <div className="mt-5">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
