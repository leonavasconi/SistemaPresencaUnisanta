import { isAuthRetryableFetchError, type SupabaseClient } from "@supabase/supabase-js";

export type SessionUser = { id: string; email?: string };

/**
 * Resultado de olhar a sessão. "Sem sessão" e "o Auth não respondeu" são coisas
 * diferentes: a primeira é logout de verdade; a segunda é uma falha nossa e não
 * pode derrubar quem está logado nem empurrar o aluno de volta para o login.
 */
export type SessionState =
  | { status: "authenticated"; user: SessionUser }
  | { status: "anonymous" }
  | { status: "unavailable" };

/** Lançado por getSessionUser quando não dá para saber se há sessão (Auth fora do ar). */
export class SessaoIndisponivelError extends Error {
  constructor() {
    super("Não foi possível verificar a sessão: o serviço de autenticação não respondeu.");
    this.name = "SessaoIndisponivelError";
  }
}

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

/** Erro de rede, timeout ou 5xx do Auth — o serviço está ruim, não é a sessão que é inválida. */
function authIndisponivel(error: unknown): boolean {
  if (isAuthRetryableFetchError(error)) return true;
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && status >= 500;
}

/**
 * Olha a sessão a partir do JWT, sem ir ao servidor de Auth (quando possível).
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
export async function getSessionState(
  supabase: { auth: SupabaseClient["auth"] },
): Promise<SessionState> {
  try {
    const { data, error } = await supabase.auth.getClaims(undefined, {
      jwks: jwksDoAmbienteOuUndefined(),
    });
    if (error) return authIndisponivel(error) ? { status: "unavailable" } : { status: "anonymous" };

    const sub = data?.claims?.sub;
    if (typeof sub !== "string" || sub.length === 0) return { status: "anonymous" };

    const email = data?.claims?.email;
    return {
      status: "authenticated",
      user: { id: sub, email: typeof email === "string" ? email : undefined },
    };
  } catch (error) {
    // Falha que o getClaims não classificou: por segurança, não desloga ninguém.
    console.error("getSessionState:", error instanceof Error ? error.name : "erro desconhecido");
    return { status: "unavailable" };
  }
}

/**
 * Usuário da sessão, ou `null` quando não há sessão. Se o Auth está fora do ar
 * lança `SessaoIndisponivelError` em vez de devolver `null`: tratar a falha
 * como "deslogado" mandaria o aluno para /entrar e geraria mais logins
 * exatamente quando o Auth está sobrecarregado.
 */
export async function getSessionUser(
  supabase: { auth: SupabaseClient["auth"] },
): Promise<SessionUser | null> {
  const state = await getSessionState(supabase);
  if (state.status === "unavailable") throw new SessaoIndisponivelError();
  return state.status === "authenticated" ? state.user : null;
}
