// O Supabase Auth devolve mensagens em inglês e voltadas ao desenvolvedor
// ("Invalid login credentials", "New password should be different..."). Esta
// tradução é a única camada que decide o que o usuário final lê, para que as
// telas de entrar, criar conta e recuperar senha falem a mesma língua.

export const SENHA_REQUISITOS =
  "A senha deve ter pelo menos 8 caracteres, 1 número e 1 caractere especial (!@#$%^&*).";

const CARACTERE_ESPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

/**
 * Os requisitos de senha, um a um. O formulário usa isto para marcar o que
 * já foi cumprido enquanto a pessoa digita; o servidor usa a mesma função
 * para decidir. Uma definição só, nenhuma chance de divergirem.
 */
export function passwordChecks(password: string) {
  return {
    comprimento: password.length >= 8,
    numero: /[0-9]/.test(password),
    especial: CARACTERE_ESPECIAL.test(password),
  };
}

export const REQUISITOS_SENHA_LISTA: { chave: keyof ReturnType<typeof passwordChecks>; rotulo: string }[] = [
  { chave: "comprimento", rotulo: "Pelo menos 8 caracteres" },
  { chave: "numero", rotulo: "Pelo menos 1 número" },
  { chave: "especial", rotulo: "Pelo menos 1 caractere especial (!@#$%&*)" },
];

/** Mesma regra aplicada no cliente e no servidor (fonte da verdade). */
export function validatePassword(password: string): string | null {
  return Object.values(passwordChecks(password)).every(Boolean) ? null : SENHA_REQUISITOS;
}

// Trechos das mensagens do Supabase -> texto que o usuário vê. A comparação é
// por `includes` porque o Supabase varia o sufixo das mensagens entre versões.
const TRADUCOES: [string, string][] = [
  ["invalid login credentials", "E-mail ou senha incorretos."],
  ["email not confirmed", "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada."],
  ["user already registered", "Já existe uma conta com este e-mail."],
  ["email address is invalid", "Informe um e-mail válido (exemplo: nome@dominio.com)."],
  ["unable to validate email address", "Informe um e-mail válido (exemplo: nome@dominio.com)."],
  ["password should be at least", SENHA_REQUISITOS],
  ["new password should be different", "A nova senha precisa ser diferente da anterior."],
  ["token has expired or is invalid", "Este link de redefinição expirou ou já foi usado. Peça um novo."],
  ["invalid flow state", "Este link de redefinição expirou ou já foi usado. Peça um novo."],
  ["code verifier", "Este link de redefinição expirou ou já foi usado. Peça um novo."],
  ["auth session missing", "Sua sessão expirou. Peça um novo link de redefinição."],
  ["for security purposes", "Aguarde alguns segundos antes de tentar novamente."],
  ["email rate limit exceeded", "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo."],
  ["over_email_send_rate_limit", "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo."],
];

export function traduzErroAuth(message: string | undefined | null, fallback: string): string {
  if (!message) return fallback;
  const normalized = message.toLowerCase();
  const hit = TRADUCOES.find(([trecho]) => normalized.includes(trecho));
  return hit ? hit[1] : fallback;
}
