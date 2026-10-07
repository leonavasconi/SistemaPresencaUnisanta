/**
 * Crachá de acesso: um cookie assinado que guarda, por pouco tempo, o que o
 * proxy já descobriu sobre a pessoa ("é admin" ou "cadastro completo"), para
 * não repetir as consultas ao banco a cada página aberta.
 *
 * Só vale como atalho: se o cookie faltar, estiver adulterado, vencido ou for
 * de outra conta, é ignorado e o proxy consulta o banco como sempre. Sem a
 * variável PROXY_COOKIE_SECRET o cache simplesmente não existe.
 *
 * Usa só Web Crypto (HMAC-SHA256), sem dependências, e não importa nada de
 * `next/headers`: roda dentro do proxy. A remoção do cookie nas ações de
 * servidor fica em `acesso-cache-server.ts`.
 *
 * O que NÃO se guarda: "cadastro incompleto". Quem acabou de concluir o
 * cadastro tem que passar na hora, sem esperar nenhum crachá vencer.
 */

export const COOKIE_ACESSO = "presenca_acesso";

/** Validade do crachá. É também o atraso máximo para uma mudança de estado (ex.: virar admin) aparecer neste navegador. */
export const VALIDADE_CRACHA_S = 60 * 60;

export type Cracha = {
  uid: string;
  admin: boolean;
  completo: boolean;
  /** Expiração, em segundos desde 1970. */
  exp: number;
};

export const OPCOES_COOKIE_ACESSO = {
  httpOnly: true,
  // `secure` só em produção: em http://localhost o navegador descartaria o cookie.
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: VALIDADE_CRACHA_S,
} as const;

const encoder = new TextEncoder();

function paraBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(texto: string): Uint8Array | null {
  try {
    const padded = texto.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(texto.length / 4) * 4, "=");
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

// A chave importada é guardada por instância; o segredo não muda enquanto ela vive.
let chaveEmCache: { segredo: string; chave: Promise<CryptoKey> } | null = null;

function chaveHmac(segredo: string): Promise<CryptoKey> {
  if (chaveEmCache?.segredo !== segredo) {
    chaveEmCache = {
      segredo,
      chave: crypto.subtle.importKey("raw", encoder.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, [
        "sign",
        "verify",
      ]),
    };
  }
  return chaveEmCache.chave;
}

/** Valor do cookie: `<dados>.<assinatura>`, ambos em base64url. `null` sem segredo configurado. */
export async function emitirCracha(cracha: Cracha): Promise<string | null> {
  const segredo = process.env.PROXY_COOKIE_SECRET;
  if (!segredo) return null;

  const dados = paraBase64Url(encoder.encode(JSON.stringify(cracha)));
  const assinatura = await crypto.subtle.sign("HMAC", await chaveHmac(segredo), encoder.encode(dados));
  return `${dados}.${paraBase64Url(new Uint8Array(assinatura))}`;
}

/**
 * Devolve o crachá só se TUDO bater: segredo configurado, assinatura válida,
 * formato esperado, não vencido e do mesmo `uid` da sessão atual. Qualquer
 * outra coisa vira `null` — nunca lança.
 */
export async function lerCracha(valor: string | undefined, uidDaSessao: string): Promise<Cracha | null> {
  const segredo = process.env.PROXY_COOKIE_SECRET;
  if (!segredo || !valor) return null;

  try {
    const partes = valor.split(".");
    if (partes.length !== 2) return null;
    const [dados, assinaturaTexto] = partes;

    const assinatura = deBase64Url(assinaturaTexto);
    if (!assinatura) return null;
    // `verify` compara em tempo constante.
    const confere = await crypto.subtle.verify(
      "HMAC",
      await chaveHmac(segredo),
      assinatura as BufferSource,
      encoder.encode(dados),
    );
    if (!confere) return null;

    const bytes = deBase64Url(dados);
    if (!bytes) return null;
    const cracha: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!cracha || typeof cracha !== "object") return null;

    const { uid, admin, completo, exp } = cracha as Record<string, unknown>;
    if (typeof uid !== "string" || typeof admin !== "boolean" || typeof completo !== "boolean") return null;
    if (typeof exp !== "number" || exp <= Date.now() / 1000) return null;
    if (uid !== uidDaSessao) return null;

    return { uid, admin, completo, exp };
  } catch {
    return null;
  }
}
