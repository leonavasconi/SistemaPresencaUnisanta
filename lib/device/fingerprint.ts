const STORAGE_KEY = "unisanta-presenca:device-id";

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Identificador estável do aparelho, usado apenas como salvaguarda de
 * exceção (3.7 da especificação) quando a biometria facial não pode ser
 * usada — não substitui a verificação facial, só evita que o mesmo celular
 * registre presença de múltiplas identidades no mesmo evento.
 */
export async function getDeviceFingerprint(): Promise<string> {
  let seed = localStorage.getItem(STORAGE_KEY);
  if (!seed) {
    seed = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, seed);
  }

  const raw = [
    seed,
    navigator.userAgent,
    navigator.language,
    String(screen.colorDepth),
    `${screen.width}x${screen.height}`,
  ].join("|");

  return sha256Hex(raw);
}
