"use client";

import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Aviso em popup (sobrepõe a tela inteira) para chamar atenção para algo que
 * o usuário precisa fazer fora do app — como liberar uma permissão do
 * navegador — antes de continuar. Diferente do `Alert`, que é só um banner
 * inline: aqui a intenção é ser difícil de ignorar.
 *
 * Renderizado via portal direto em `document.body`: um `position: fixed`
 * normal seria às vezes preso dentro de um ancestral com `backdrop-blur`/
 * `filter`/`transform` (como o card do `CheckinFlow`), que cria um novo
 * "containing block" e faz o popup virar um quadrado preso ali dentro em vez
 * de cobrir a tela inteira. O portal ignora essa hierarquia.
 */
export function PermissionModal({
  title,
  message,
  onDismiss,
}: {
  title: string;
  message: string;
  onDismiss: () => void;
}) {
  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="permission-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-unisanta-navy/30 px-6 backdrop-blur-sm"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <h2 id="permission-modal-title" className="font-medium text-zinc-800">
          {title}
        </h2>
        <p className="text-sm text-zinc-500">{message}</p>
        <Button type="button" onClick={onDismiss} className="w-full">
          Entendi
        </Button>
      </div>
    </div>,
    document.body,
  );
}
