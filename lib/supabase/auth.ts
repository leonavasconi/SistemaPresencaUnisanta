import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionUser = { id: string; email?: string };

type ClaimsOptions = NonNullable<Parameters<SupabaseClient["auth"]["getClaims"]>[1]>;
type Jwks = NonNullable<ClaimsOptions["jwks"]>;

// Lido uma vez por instância: o valor não muda enquanto ela está de pé.
let jwksDoAmbiente: Jwks | null | undefined;

/**
 * JWKS público do projeto, vindo de SUPABASE_JWKS (ver README).
 *
 * Com ele, o `getClaims` confere a assinatura do token sem ir buscar as chaves
 * em /auth/v1/.well-known/jwks.json. Sem ele, cada instância nova da função
 * (e no pico elas sobem aos montes) faz essa busca ao Auth — e a busca não tem
 * timeout, então se o Auth engasga a requisição inteira fica pendurada.
 *
 * Variável ausente ou inválida devolve `undefined`: o comportamento é o de
 * antes (busca na rede), nunca um erro.
 */
function jwksDoAmbienteOuUndefined(): Jwks | undefined {
  if (jwksDoAmbiente !== undefined) return jwksDoAmbiente ?? undefined;

  jwksDoAmbiente = null;
  const bruto = process.env.SUPABASE_JWKS;
  if (bruto) {
    try {
      const parsed: unknown = JSON.parse(bruto);
      const keys = (parsed as { keys?: unknown } | null)?.keys;
      if (Array.isArray(keys) && keys.length > 0) jwksDoAmbiente = { keys } as Jwks;
    } catch {
      // JSON inválido: ignora e segue com a busca na rede.
    }
  }
  return jwksDoAmbiente ?? undefined;
}

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
  const { data, error } = await supabase.auth.getClaims(undefined, {
    jwks: jwksDoAmbienteOuUndefined(),
  });
  const sub = data?.claims?.sub;
  if (error || typeof sub !== "string" || sub.length === 0) return null;

  const email = data?.claims?.email;
  return { id: sub, email: typeof email === "string" ? email : undefined };
}
