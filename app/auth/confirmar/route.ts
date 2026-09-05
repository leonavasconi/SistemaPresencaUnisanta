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
 * Aceita os dois formatos, porque dependem do template configurado no projeto:
 *
 *   - `?token_hash=...&type=...`  é o que o sistema usa. Funciona em qualquer
 *     navegador, que é o que importa aqui: as pessoas abrem o e-mail no
 *     celular, num cliente de e-mail, longe de onde pediram a recuperação.
 *
 *   - `?code=...` é o fluxo PKCE, mantido só por compatibilidade. Ele exige
 *     um "code verifier" guardado no navegador que PEDIU a recuperação, então
 *     falha justamente no caso comum de abrir o e-mail em outro lugar. Se o
 *     link chegar nesse formato, o template ainda não foi atualizado.
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

  const falha = (mensagem: string) =>
    NextResponse.redirect(new URL(`/esqueci-senha?error=${encodeURIComponent(mensagem)}`, origin));

  // Caminho principal: independe de qualquer estado no navegador.
  if (!urlError && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(next, origin));
    return falha(traduzErroAuth(error.message, LINK_INVALIDO));
  }

  // Compatibilidade com o template antigo (PKCE). Só conclui se o link for
  // aberto no mesmo navegador que pediu a recuperação.
  if (!urlError && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));

    return falha(
      "Abra o link no mesmo navegador em que você pediu a recuperação, ou peça um novo link por aqui.",
    );
  }

  return falha(traduzErroAuth(urlError, LINK_INVALIDO));
}
