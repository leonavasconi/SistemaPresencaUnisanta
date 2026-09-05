import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // O padrão do @supabase/ssr é PKCE, que guarda um "code verifier" no
      // navegador que iniciou o fluxo. Isso quebra a recuperação de senha:
      // as pessoas pedem no computador e abrem o e-mail no celular, onde o
      // verifier não existe. No fluxo implícito a sessão vem na própria URL
      // de retorno, então o link funciona em qualquer navegador.
      //
      // Não afeta o resto: login e cadastro são por e-mail e senha, que não
      // passam por nenhum dos dois fluxos.
      auth: { flowType: "implicit" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // chamado a partir de um Server Component — ignorado porque o
            // middleware já cuida de renovar a sessão nesses casos.
          }
        },
      },
    },
  );
}
