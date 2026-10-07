/**
 * Bloco cinza pulsante que ocupa o lugar do conteúdo enquanto a página carrega
 * (ver os `loading.tsx` das rotas). `aria-hidden` porque é só decoração: quem
 * usa leitor de tela é avisado pelo `role="status"` do contêiner.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-zinc-200/70 ${className}`} />;
}
