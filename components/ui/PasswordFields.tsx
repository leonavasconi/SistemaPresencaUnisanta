"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Label } from "./Input";
import { PasswordInput } from "./PasswordInput";
import {
  passwordChecks,
  REQUISITOS_SENHA_LISTA,
  validatePassword,
} from "@/lib/auth/errors";

/**
 * Par "senha + confirmação" com conferência ao vivo.
 *
 * A validação continua existindo no servidor (é ela que decide), mas repetir
 * aqui evita o pior caso: enviar o formulário, receber o erro por redirect e
 * perder tudo o que já havia sido preenchido.
 *
 * A lista de requisitos fica escondida enquanto está tudo certo — só aparece
 * quando há o que corrigir, para não encher a tela de texto no caso comum.
 *
 * `onValidChange` deixa o formulário que usa este componente desabilitar o
 * botão de envio enquanto os requisitos não estiverem cumpridos.
 */
export function PasswordFields({
  onValidChange,
  passwordLabel = "Senha",
  confirmationLabel = "Confirmar senha",
  className = "",
}: {
  onValidChange?: (valid: boolean) => void;
  passwordLabel?: string;
  confirmationLabel?: string;
  /** Classes do container — permite ao formulário pôr os dois campos lado a lado. */
  className?: string;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const checks = passwordChecks(password);
  const strongEnough = validatePassword(password) === null;
  const matches = password.length > 0 && password === confirmation;
  const mismatch = confirmation.length > 0 && password !== confirmation;

  function update(nextPassword: string, nextConfirmation: string) {
    setPassword(nextPassword);
    setConfirmation(nextConfirmation);
    onValidChange?.(
      validatePassword(nextPassword) === null && nextPassword === nextConfirmation,
    );
  }

  return (
    <div className={`grid gap-4 ${className}`}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" required>
          {passwordLabel}
        </Label>
        <PasswordInput
          id="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => update(e.target.value, confirmation)}
          placeholder="Mínimo de 8 caracteres"
          aria-describedby="ajuda-senha"
        />

        {password.length > 0 && !strongEnough ? (
          <ul id="ajuda-senha" className="mt-0.5 flex flex-col gap-1">
            {REQUISITOS_SENHA_LISTA.map(({ chave, rotulo }) => (
              <li
                key={chave}
                className={`flex items-center gap-1.5 text-xs ${
                  checks[chave] ? "text-emerald-600" : "text-zinc-400"
                }`}
              >
                {checks[chave] ? (
                  <Check className="h-3 w-3 shrink-0" />
                ) : (
                  <X className="h-3 w-3 shrink-0" />
                )}
                {rotulo}
              </li>
            ))}
          </ul>
        ) : (
          <p id="ajuda-senha" className="text-xs text-zinc-400">
            8+ caracteres, com 1 número e 1 símbolo.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="passwordConfirmation" required>
          {confirmationLabel}
        </Label>
        <PasswordInput
          id="passwordConfirmation"
          name="passwordConfirmation"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmation}
          onChange={(e) => update(password, e.target.value)}
          placeholder="Repita a senha"
          aria-invalid={mismatch}
          aria-describedby={mismatch || matches ? "estado-confirmacao" : undefined}
        />

        {mismatch && (
          <p
            id="estado-confirmacao"
            className="flex items-center gap-1.5 text-xs text-unisanta-red"
          >
            <X className="h-3 w-3 shrink-0" />
            As senhas não coincidem.
          </p>
        )}
        {matches && (
          <p
            id="estado-confirmacao"
            className="flex items-center gap-1.5 text-xs text-emerald-600"
          >
            <Check className="h-3 w-3 shrink-0" />
            As senhas coincidem.
          </p>
        )}
      </div>
    </div>
  );
}
