import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Fluxo implícito em vez do PKCE padrão, por causa da recuperação de
      // senha: o PKCE guarda um "code verifier" no navegador que iniciou o
      // pedido, e o link do e-mail só se completa lá. Como as pessoas pedem
      // no computador e abrem o e-mail no celular, o link falhava.
      //
      // No implícito a sessão volta na própria URL, sem estado guardado, e o
      // link funciona em qualquer navegador. Login e cadastro são por e-mail
      // e senha e não passam por nenhum dos dois fluxos.
      auth: { flowType: "implicit" },
    },
  );
}
