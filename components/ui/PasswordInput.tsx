"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "./Input";

/**
 * Campo de senha com botão de mostrar/ocultar. Digitar uma senha às cegas e
 * ainda ter que repeti-la é a principal fonte de erro nesses formulários —
 * poder conferir o que foi digitado resolve na origem.
 *
 * O estado é local a cada campo: revelar a senha não revela a confirmação.
 */
export function PasswordInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        icon={Lock}
        {...props}
        type={visible ? "text" : "password"}
        className={`pr-11 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // Sem tabIndex negativo: quem navega por teclado também precisa
        // conseguir conferir o que digitou.
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-unisanta-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unisanta-navy/40"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
