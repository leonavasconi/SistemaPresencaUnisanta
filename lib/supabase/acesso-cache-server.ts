import { cookies } from "next/headers";
import { COOKIE_ACESSO } from "./acesso-cache";

/**
 * Apaga o crachá de acesso (ver `acesso-cache.ts`). Chamar em toda ação de
 * servidor que muda o que ele afirma: logout, login, exclusão de dados e
 * conclusão do cadastro. Sem isso o proxy continuaria acreditando no estado
 * antigo até o crachá vencer.
 *
 * Apagar um cookie que não existe é inofensivo.
 */
export async function apagarCrachaDeAcesso() {
  const store = await cookies();
  store.delete({ name: COOKIE_ACESSO, path: "/" });
}
