import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { traduzErroAuth } from "@/lib/auth/errors";

const LINK_INVALIDO = "Este link de redefinição expirou ou já foi usado. Peça um novo.";

/**
 * Ponto de chegada dos links enviados por e-mail pelo Supabase (hoje, o de
 * redefinição de senha). Troca o código de uso único que veio na URL por uma
 * sessão real e encaminha para a página de destino.
 *
 * Aceita os dois formatos possíveis porque eles dependem do template de
 * e-mail configurado no projeto Supabase:
 *   - `?code=...`                  fluxo PKCE (template com {{ .ConfirmationURL }});
 *   - `?token_hash=...&type=...`   fluxo OTP  (template com {{ .TokenHash }}).
 *
 * Um link expirado, adulterado ou já usado nunca cria sessão: o erro do
 * Supabase é convertido em mensagem e o usuário volta para pedir outro.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Só caminhos internos, para o parâmetro não virar um redirecionamento
  // aberto para fora do site.
  const requested = searchParams.get("proximo") ?? "/redefinir-senha";
  const next = requested.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/redefinir-senha";

  // O Supabase também pode devolver o erro direto na URL (link já consumido).
  const urlError = searchParams.get("error_description") ?? searchParams.get("error");

  const supabase = await createClient();

  if (!urlError && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    return NextResponse.redirect(
      new URL(
        `/esqueci-senha?error=${encodeURIComponent(traduzErroAuth(error.message, LINK_INVALIDO))}`,
        origin,
      ),
    );
  }

  if (!urlError && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    return NextResponse.redirect(
      new URL(
        `/esqueci-senha?error=${encodeURIComponent(traduzErroAuth(error.message, LINK_INVALIDO))}`,
        origin,
      ),
    );
  }

  return NextResponse.redirect(
    new URL(
      `/esqueci-senha?error=${encodeURIComponent(traduzErroAuth(urlError, LINK_INVALIDO))}`,
      origin,
    ),
  );
}
