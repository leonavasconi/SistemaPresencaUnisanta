"use client";

import { useFormStatus } from "react-dom";
import { Loader2, LogOut } from "lucide-react";

/**
 * Botão "Sair" dos cabeçalhos. Fica dentro de um `<form action={signOut...}>`:
 * o `useFormStatus` enxerga o envio e troca o ícone por um spinner, já que
 * encerrar a sessão e redirecionar pode levar um instante.
 */
export function SignOutButton({
  className = "",
  hideLabelOnMobile = false,
}: {
  className?: string;
  /** No cabeçalho do participante o rótulo some no celular; o ícone fica. */
  hideLabelOnMobile?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={`flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <LogOut className="h-3.5 w-3.5" aria-hidden />
      )}
      <span className={hideLabelOnMobile && !pending ? "hidden sm:inline" : undefined}>
        {pending ? "Saindo..." : "Sair"}
      </span>
    </button>
  );
}
