import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ENROLLMENT_COLUMNS, isEnrollmentComplete } from "@/lib/enrollment";

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

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Preserva os cookies de sessão renovados pelo `getUser` acima — sem isso,
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

  if (isAdminProtected && !user) return redirectTo(ADMIN_LOGIN);
  if (isParticipantRoute && !user) return redirectTo("/entrar");

  // Só consulta o perfil quando a resposta muda alguma decisão — evita uma
  // ida ao banco em toda requisição de rota pública.
  if (!user || (!isAdminArea && !isParticipantRoute && !isParticipantAuth)) {
    return semCache(response);
  }

  const { data: profile } = await supabase
    .from("perfis")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = !!profile;

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
    const { data: participante } = await supabase
      .from("participantes")
      .select(ENROLLMENT_COLUMNS)
      .eq("id", user.id)
      .maybeSingle();

    if (!isEnrollmentComplete(participante)) return redirectTo(ENROLLMENT_ROUTE);
  }

  // Quem já está autenticado não precisa ver tela de login. Participantes vão
  // para /cadastro, que encaminha para /eventos quando já está tudo concluído.
  if (isParticipantAuth) return redirectTo(isAdmin ? "/admin/events" : ENROLLMENT_ROUTE);
  if (path === ADMIN_LOGIN && isAdmin) return redirectTo("/admin/events");

  return semCache(response);
}
