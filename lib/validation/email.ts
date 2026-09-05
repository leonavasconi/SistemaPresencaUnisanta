// Validação e normalização de e-mail, compartilhada por todos os fluxos de
// autenticação (criar conta, entrar, recuperar senha). Fica em um módulo só
// para que cliente e servidor apliquem exatamente a mesma regra — o servidor
// é a fonte da verdade, o cliente só antecipa o erro.

/**
 * Normaliza o e-mail digitado: remove espaços nas pontas (os que vêm de
 * copiar/colar) e padroniza para minúsculas, já que o Supabase Auth trata
 * e-mails como case-insensitive. Sem isso, "  Joao@X.com " e "joao@x.com"
 * viram duas contas diferentes na percepção do usuário.
 *
 * Espaços no meio são deixados de propósito: apagá-los transformaria
 * "a b@c.com" no endereço válido "ab@c.com", cadastrando a pessoa num e-mail
 * que ela não digitou. É melhor recusar e deixar que ela corrija.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// Deliberadamente permissivo quanto ao domínio: qualquer provedor serve, não
// só os institucionais da Unisanta. O que se exige é apenas que o endereço
// tenha a forma `local@dominio.tld`, com um TLD de pelo menos 2 letras.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

export const EMAIL_INVALIDO = "Informe um e-mail válido (exemplo: nome@dominio.com).";

/**
 * Normaliza e valida em uma passada. Devolve o e-mail já normalizado (pronto
 * para ir ao banco) ou a mensagem de erro a mostrar ao usuário.
 */
export function parseEmail(raw: unknown): { email: string; error: string | null } {
  const email = normalizeEmail(String(raw ?? ""));

  if (!email) {
    return { email, error: "Informe seu e-mail." };
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { email, error: EMAIL_INVALIDO };
  }
  return { email, error: null };
}

export function isValidEmail(raw: unknown): boolean {
  return parseEmail(raw).error === null;
}
