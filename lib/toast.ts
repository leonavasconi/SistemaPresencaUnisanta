/**
 * Avisos rápidos ("Momentos salvos.") que somem sozinhos.
 *
 * Qualquer código de navegador chama `showToast`; o `<Toaster />` montado no
 * layout raiz escuta o evento e desenha o aviso. Sem provider nem contexto, de
 * propósito: quem dispara não precisa saber onde o aviso aparece.
 *
 * Ações de servidor, que terminam em `redirect`, não conseguem chamar isso
 * direto — elas anexam `?ok=<chave>` ao destino e o `<Toaster />` traduz a
 * chave em mensagem (ver `FLASH_MESSAGES`) e limpa o parâmetro da URL.
 */
export const TOAST_EVENT = "app:toast";

export type ToastVariant = "success" | "error";
export type ToastDetail = { message: string; variant: ToastVariant };

export function showToast(message: string, variant: ToastVariant = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { message, variant } }));
}

/** Chaves aceitas em `?ok=`. Chave desconhecida é ignorada, nunca exibida. */
export const FLASH_MESSAGES: Record<string, string> = {
  "evento-criado": "Evento criado com sucesso.",
  "momentos-salvos": "Momentos de presença salvos.",
};
