"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PasswordFields } from "@/components/ui/PasswordFields";
import { updatePassword } from "./actions";

export function ResetPasswordForm() {
  const [passwordValid, setPasswordValid] = useState(false);

  return (
    <form action={updatePassword} className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <PasswordFields
          onValidChange={setPasswordValid}
          passwordLabel="Nova senha"
          confirmationLabel="Confirmar nova senha"
        />
      </div>
      <SubmitButton variant="secondary" disabled={!passwordValid} className="w-full">
        <KeyRound className="h-4 w-4" />
        Salvar nova senha
      </SubmitButton>
    </form>
  );
}
