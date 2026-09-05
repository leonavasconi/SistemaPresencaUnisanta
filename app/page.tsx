import { redirect } from "next/navigation";

/**
 * A raiz do site é a porta de entrada do participante: quem abre o endereço
 * cai direto no login (e, se já estiver autenticado, o middleware segue para
 * a lista de eventos).
 *
 * O acesso administrativo deixou de ser anunciado aqui — chega-se a ele
 * digitando /admin/entrar. Isso é só para não expor a porta: a proteção real
 * continua no middleware, que exige registro em `perfis` para qualquer rota
 * sob /admin.
 */
export default function Home() {
  redirect("/entrar");
}
