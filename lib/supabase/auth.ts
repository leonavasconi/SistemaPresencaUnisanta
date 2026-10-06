import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionUser = { id: string; email?: string };

/**
 * Identifica o usuário da sessão a partir do JWT, sem ir ao servidor de Auth.
 *
 * `getUser()` faz uma requisição ao Supabase Auth a cada chamada. Em pico
 * (centenas de alunos abrindo o check-in no mesmo minuto) isso derrubou o
 * serviço de Auth com 504/503. `getClaims()` valida a assinatura do token
 * localmente quando o projeto usa chaves JWT assimétricas — mesma garantia
 * de autenticidade, sem custo de rede.
 *
 * Use `getUser()` apenas onde for preciso saber se a sessão foi revogada
 * agora (ações sensíveis e pouco frequentes, como excluir dados).
 */
export async function getSessionUser(
  supabase: { auth: SupabaseClient["auth"] },
): Promise<SessionUser | null> {
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || typeof sub !== "string" || sub.length === 0) return null;

  const email = data?.claims?.email;
  return { id: sub, email: typeof email === "string" ? email : undefined };
}
