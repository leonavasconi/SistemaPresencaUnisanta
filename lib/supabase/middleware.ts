import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  const isAdminRoute = path.startsWith("/admin") && path !== "/admin/entrar";
  const isStudentRoute =
    ["/cadastro", "/presenca", "/minhas-presencas", "/meus-dados", "/eventos"].some((p) =>
      path.startsWith(p),
    );

  if (isAdminRoute && !user) {
    return NextResponse.redirect(new URL("/admin/entrar", request.url));
  }

  if (isStudentRoute && !user) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }

  if (isAdminRoute && user) {
    const { data: profile } = await supabase
      .from("perfis")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.redirect(new URL("/admin/entrar", request.url));
    }
  }

  return response;
}
