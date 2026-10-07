import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionUser = { id: string; email?: string };

/**
 * Teto de espera para a verificação de sessão, em milissegundos.
 *
 * `getClaims()` valida o token localmente, mas ainda pode ir à rede em dois
 * casos: buscar a chave pública (JWKS) na primeira vez que a instância roda e
 * renovar um token prestes a expirar. Se o Supabase Auth estiver lento ou fora
 * do ar, essas chamadas travam — e, no middleware, cada requisição presa ocupa
 * uma instância da Vercel até o teto de 300 s, derrubando o site inteiro em
 * cascata (foi a causa raiz do incidente de 06/10). Com um teto curto, uma
 * falha de Auth vira "trate como não autenticado" em vez de "trave tudo".
 *
 * Ajustável por `AUTH_TIMEOUT_MS` sem precisar de deploy de código.
 */
const AUTH_TIMEOUT_MS = Number(process.env.AUTH_TIMEOUT_MS) || 3000;

const TIMED_OUT = Symbol("auth-timeout");

/**
 * Identifica o usuário da sessão a partir do JWT, sem ir ao servidor de Auth.
 *
 * `getUser()` faz uma requisição ao Supabase Auth a cada chamada. Em pico
 * (centenas de alunos abrindo o check-in no mesmo minuto) isso derrubou o
 * serviço de Auth com 504/503. `getClaims()` valida a assinatura do token
 * localmente quando o projeto usa chaves JWT assimétricas — mesma garantia
 * de autenticidade, sem custo de rede no caminho feliz.
 *
 * Use `getUser()` apenas onde for preciso saber se a sessão foi revogada
 * agora (ações sensíveis e pouco frequentes, como excluir dados).
 */
export async function getSessionUser(
  supabase: { auth: SupabaseClient["auth"] },
): Promise<SessionUser | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const result = await Promise.race([
    supabase.auth.getClaims(),
    new Promise<typeof TIMED_OUT>((resolve) => {
      timer = setTimeout(() => resolve(TIMED_OUT), AUTH_TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(timer));

  // Auth demorou além do teto: degrada para "sem sessão". No middleware isso
  // vira um redirecionamento rápido para o login (página pública) em vez de
  // uma requisição presa por 300 s.
  if (result === TIMED_OUT) return null;

  const { data, error } = result;
  const sub = data?.claims?.sub;
  if (error || typeof sub !== "string" || sub.length === 0) return null;

  const email = data?.claims?.email;
  return { id: sub, email: typeof email === "string" ? email : undefined };
}
