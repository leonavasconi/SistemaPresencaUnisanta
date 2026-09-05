"use client";

import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/Alert";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { parseEmail } from "@/lib/validation/email";
import { traduzErroAuth } from "@/lib/auth/errors";

/**
 * Pedido de recuperação de senha, disparado do NAVEGADOR e não do servidor.
 *
 * Não é preferência de estilo: o `createServerClient` do @supabase/ssr usa
 * PKCE obrigatoriamente, e o PKCE prende o link ao navegador que o pediu —
 * quem abre o e-mail no celular recebe "link expirado". Feito daqui, o
 * cliente usa o fluxo implícito (ver lib/supabase/client.ts) e o link passa a
 * funcionar em qualquer lugar.
 *
 * A validação de e-mail é a mesma do resto do sistema (lib/validation/email).
 */
export function EsqueciSenhaForm({ onEnviado }: { onEnviado: () => void }) {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const { email: normalizado, error: erroEmail } = parseEmail(email);
    if (erroEmail) {
      setErro(erroEmail);
      return;
    }

    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizado, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setEnviando(false);

    // "E-mail não cadastrado" nunca é revelado: isso permitiria descobrir
    // quem tem conta testando endereços. Só erros de infraestrutura aparecem.
    if (error) {
      setErro(
        traduzErroAuth(error.message, "Não foi possível enviar o e-mail agora. Tente novamente."),
      );
      return;
    }

    onEnviado();
  }

  return (
    <>
      {erro && <Alert>{erro}</Alert>}

      <form onSubmit={enviar} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" required>
            E-mail
          </Label>
          <Input
            id="email"
            icon={Mail}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="nome@dominio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Button type="submit" variant="primary" loading={enviando} className="w-full">
          <Send className="h-4 w-4" />
          Enviar link de redefinição
        </Button>
      </form>
    </>
  );
}
