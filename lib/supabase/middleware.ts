import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cadastroEstaCompleto } from "@/lib/enrollment";
import {
  COOKIE_ACESSO,
  OPCOES_COOKIE_ACESSO,
  VALIDADE_CRACHA_S,
  emitirCracha,
  lerCracha,
} from "@/lib/supabase/acesso-cache";
import { getSessionState } from "@/lib/supabase/auth";
import { paginaSistemaOcupado } from "@/lib/supabase/sistema-ocupado";

/** Onde o participante conclui consentimento e biometria. */
const ENROLLMENT_ROUTE = "/cadastro";

// Rotas do participante. O acesso administrativo vive inteiro sob /admin e
// nunca aparece nestas telas.
const PARTICIPANT_ROUTES = [
  "/cadastro",
  "/presenca",
  "/minhas-presencas",
  "/meus-dados",
  "/eventos",
];

// Telas de entrada de cada lado — públicas, mas de onde quem já está
// autenticado deve ser tirado.
const PARTICIPANT_AUTH_ROUTES = ["/entrar", "/criar-conta"];
const ADMIN_LOGIN = "/admin/entrar";

// Fora de qualquer regra: a redefinição de senha cria uma sessão temporária
// própria, e redirecionar quem está no meio dela quebraria o fluxo.
const PUBLIC_ROUTES = ["/esqueci-senha", "/redefinir-senha", "/auth/"];

// Prazo de cada chamada ao Supabase feita pelo proxy (refresh de sessão,
// busca do JWKS, consultas a perfis/participantes). Sem ele, um Auth ou banco
// engasgados seguravam a requisição até o limite da função (300 s) e
// derrubavam todas as rotas. Estourar o prazo cai no mesmo tratamento de
// "indisponível" (ver `degradar`).
const SUPABASE_TIMEOUT_MS = 3000;

// Prazo TOTAL da requisição no proxy, somando sessão e consultas. O de cima não
// basta: o supabase-js repete o refresh de sessão (backoff de até ~30 s) e o
// cliente do banco repete as consultas, e cada tentativa ganha um prazo novo.
const PRAZO_TOTAL_MS = 4000;
const PRAZO_ESTOUROU = Symbol("prazo-estourou");

const fetchComTimeout: typeof fetch = (input, init) => {
  const prazo = AbortSignal.timeout(SUPABASE_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, prazo]) : prazo;
  return fetch(input, { ...init, signal });
};

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const inicio = Date.now();

  /** Espera o trabalho só até o prazo total da requisição; passou disso, devolve PRAZO_ESTOUROU. */
  function comPrazo<T>(trabalho: PromiseLike<T>): Promise<T | typeof PRAZO_ESTOUROU> {
    const restante = Math.max(0, PRAZO_TOTAL_MS - (Date.now() - inicio));
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(PRAZO_ESTOUROU), restante);
      Promise.resolve(trabalho).then(
        (valor) => {
          clearTimeout(timer);
          resolve(valor);
        },
        () => {
          clearTimeout(timer);
          resolve(PRAZO_ESTOUROU);
        },
      );
    });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: fetchComTimeout },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Valida o JWT localmente (sem ir ao servidor de Auth) e renova os cookies
  // de sessão quando o token expira. Ver lib/supabase/auth.ts.
  const session = await comPrazo(getSessionState(supabase));

  const path = request.nextUrl.pathname;

  // Preserva os cookies de sessão renovados pelo `getClaims` acima — sem isso,
  // um redirecionamento que acontece logo após a renovação do token descarta
  // o token novo e derruba a sessão do usuário.
  function redirectTo(destination: string) {
    const redirect = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "no-store, must-revalidate");
    return redirect;
  }

  /**
   * Impede que uma tela fique guardada no histórico do navegador.
   *
   * Sem isto, o botão "voltar" reexibe a página como ela estava antes do
   * login — vinda do cache, sem passar por este middleware. Quem acabou de
   * criar a conta via de novo o formulário de cadastro, como se nada tivesse
   * acontecido.
   */
  function semCache(res: NextResponse) {
    res.headers.set("Cache-Control", "no-store, must-revalidate");
    return res;
  }

  if (PUBLIC_ROUTES.some((p) => path.startsWith(p))) {
    return semCache(response);
  }

  const isAdminArea = path.startsWith("/admin");
  const isAdminProtected = isAdminArea && path !== ADMIN_LOGIN;
  const isParticipantRoute = PARTICIPANT_ROUTES.some((p) => path.startsWith(p));
  const isParticipantAuth = PARTICIPANT_AUTH_ROUTES.some((p) => path.startsWith(p));
  const isProtected = isAdminProtected || isParticipantRoute;

  /**
   * Auth ou banco lentos/fora do ar: não é motivo para deslogar nem para
   * redirecionar ninguém (mandar o aluno para /entrar geraria mais logins no
   * pior momento). Rota protegida recebe uma página leve de "sistema ocupado"
   * (503, sem redirect, então sem loop); rota pública segue normalmente.
   */
  function degradar() {
    if (!isProtected) return semCache(response);
    const ocupado = new NextResponse(paginaSistemaOcupado(), {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, must-revalidate",
        "Retry-After": "5",
      },
    });
    response.cookies.getAll().forEach((cookie) => ocupado.cookies.set(cookie));
    return ocupado;
  }

  if (session === PRAZO_ESTOUROU || session.status === "unavailable") return degradar();
  const user = session.status === "authenticated" ? session.user : null;

  if (isAdminProtected && !user) return redirectTo(ADMIN_LOGIN);
  if (isParticipantRoute && !user) return redirectTo("/entrar");

  // Só consulta o perfil quando a resposta muda alguma decisão — evita uma
  // ida ao banco em toda requisição de rota pública.
  if (!user || (!isAdminArea && !isParticipantRoute && !isParticipantAuth)) {
    return semCache(response);
  }

  // Crachá válido (assinatura, validade e mesma conta) dispensa as consultas
  // abaixo. Ver lib/supabase/acesso-cache.ts.
  const cracha = await lerCracha(request.cookies.get(COOKIE_ACESSO)?.value, user.id);

  /** Grava o crachá no navegador. Sem PROXY_COOKIE_SECRET não faz nada. */
  async function guardarCracha(uid: string, admin: boolean, completo: boolean) {
    const exp = Math.floor(Date.now() / 1000) + VALIDADE_CRACHA_S;
    const valor = await emitirCracha({ uid, admin, completo, exp });
    if (valor) response.cookies.set(COOKIE_ACESSO, valor, OPCOES_COOKIE_ACESSO);
  }

  let isAdmin: boolean;
  if (cracha) {
    isAdmin = cracha.admin;
  } else {
    const perfil = await comPrazo(
      supabase.from("perfis").select("id").eq("id", user.id).maybeSingle(),
    );
    // Erro ou prazo estourado na consulta não é "não é admin": sem esta
    // checagem o participante seria tratado como não-admin e redirecionado.
    if (perfil === PRAZO_ESTOUROU || perfil.error) return degradar();
    isAdmin = !!perfil.data;
    if (isAdmin) await guardarCracha(user.id, true, false);
  }

  // Sessão sem perfil de administrador não entra na área administrativa,
  // mesmo autenticada com sucesso.
  if (isAdminProtected && !isAdmin) return redirectTo(ADMIN_LOGIN);

  // E o inverso: um administrador não circula pelas telas de participante,
  // que assumem um cadastro em `participantes` que ele não tem.
  if (isParticipantRoute && isAdmin) return redirectTo("/admin/events");

  // Ter conta não é ter acesso: enquanto o consentimento LGPD e a biometria
  // não estiverem registrados, o participante só pode estar em /cadastro.
  // Sem esta checagem, bastava voltar uma página no navegador depois de criar
  // a conta para cair em /eventos com o cadastro pela metade.
  if (!isAdmin && (isParticipantRoute || isParticipantAuth) && !path.startsWith(ENROLLMENT_ROUTE)) {
    // Só "completo" entra no crachá; "incompleto" nunca, para quem acabou de
    // concluir o cadastro passar na hora.
    if (!cracha?.completo) {
      const completo = await comPrazo(cadastroEstaCompleto(supabase, user.id));
      // Mesmo cuidado: erro (null) ou prazo estourado não é "cadastro incompleto".
      if (completo === PRAZO_ESTOUROU || completo === null) return degradar();

      if (!completo) return redirectTo(ENROLLMENT_ROUTE);
      await guardarCracha(user.id, false, true);
    }
  }

  // Quem já está autenticado não precisa ver tela de login. Participantes vão
  // para /cadastro, que encaminha para /eventos quando já está tudo concluído.
  if (isParticipantAuth) return redirectTo(isAdmin ? "/admin/events" : ENROLLMENT_ROUTE);
  if (path === ADMIN_LOGIN && isAdmin) return redirectTo("/admin/events");

  return semCache(response);
}
