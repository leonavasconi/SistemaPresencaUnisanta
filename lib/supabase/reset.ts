import { createClient } from "@supabase/supabase-js";

/**
 * Cliente usado apenas para disparar o e-mail de recuperação de senha.
 *
 * Por que não o cliente normal: o `@supabase/ssr` fixa `flowType: "pkce"` no
 * próprio código — a opção passada por quem chama é sobrescrita
 * (createBrowserClient.js, `...options?.auth` antes de `flowType: "pkce"`).
 * E o PKCE guarda um "code verifier" no navegador que pediu a recuperação,
 * de modo que o link do e-mail só se completa naquele navegador. Como as
 * pessoas pedem no computador e abrem o e-mail no celular, o link falhava
 * com "link expirado".
 *
 * O `@supabase/supabase-js` puro respeita o fluxo implícito, em que a sessão
 * volta no fragmento da URL e nada fica guardado no navegador de origem.
 * Quem recolhe esse fragmento é app/redefinir-senha/RecuperarSessaoDoLink.tsx,
 * que entrega os tokens ao cliente normal — e é ele que grava os cookies
 * lidos pelo servidor.
 *
 * `persistSession: false` porque aqui não se cria sessão nenhuma: só se pede
 * o envio do e-mail. Assim este cliente não disputa o armazenamento com o
 * cliente de verdade do app.
 */
export function createResetClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
