"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./Button";

/**
 * Botão de envio que entra sozinho em estado de carregamento enquanto a
 * Server Action do formulário está rodando.
 *
 * `useFormStatus` lê o estado do <form> que envolve o botão, então não é
 * preciso controlar "enviando" à mão em cada tela — e o botão fica bloqueado
 * durante o envio, o que evita cadastro em duplicidade por clique repetido.
 */
export function SubmitButton({
  children,
  disabled,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} loading={pending} disabled={disabled} className={className}>
      {children}
    </Button>
  );
}
