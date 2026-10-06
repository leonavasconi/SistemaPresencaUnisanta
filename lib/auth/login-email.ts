import { cookies } from "next/headers";

/**
 * Lembra o e-mail digitado quando o login falha, para a tela abrir de novo com
 * ele preenchido e só a senha em branco.
 *
 * A falha termina em `redirect`, que recarrega a página e esvazia o formulário.
 * O e-mail vai num cookie de curta duração, em vez de ir na URL, para não
 * ficar no histórico do navegador nem nos logs do servidor. `httpOnly`: só o
 * servidor lê. O cookie vale apenas para a própria tela de login (`path`).
 */
const COOKIE_NAME = "ultimo_email_login";
const MAX_AGE_SECONDS = 120;

export async function lembrarEmailDeLogin(email: string, path: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, email, {
    path,
    maxAge: MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

/** Login deu certo: não há mais o que lembrar. */
export async function esquecerEmailDeLogin(path: string) {
  const store = await cookies();
  store.delete({ name: COOKIE_NAME, path });
}

export async function emailDeLoginLembrado(): Promise<string> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? "";
}
