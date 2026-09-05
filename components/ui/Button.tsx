import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-unisanta-red to-unisanta-red-dark text-white shadow-sm shadow-red-900/20 hover:brightness-110 active:brightness-95",
  secondary:
    "bg-gradient-to-b from-unisanta-navy to-unisanta-navy-dark text-white shadow-sm shadow-indigo-950/20 hover:brightness-110 active:brightness-95",
  outline:
    "border border-unisanta-navy/30 text-unisanta-navy bg-white hover:bg-unisanta-navy hover:text-white hover:border-unisanta-navy",
  ghost: "text-unisanta-navy hover:bg-unisanta-navy/5",
  danger:
    "bg-red-50 text-unisanta-red border border-red-100 hover:bg-unisanta-red hover:text-white hover:border-unisanta-red",
};

// Desabilitado vira cinza neutro em vez de "a mesma cor, mais clara" — um
// botão vermelho a 50% de opacidade lê como rosa desbotado, não como
// indisponível. `bg-none` é necessário para apagar o gradiente da variante,
// que é background-image e não seria coberto por uma cor de fundo.
const DISABLED_CLASSES =
  "disabled:cursor-not-allowed disabled:bg-none disabled:bg-zinc-100 disabled:text-zinc-400 disabled:shadow-none disabled:border-transparent disabled:hover:brightness-100";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    /** Mostra o spinner e bloqueia novos cliques enquanto a ação corre. */
    loading?: boolean;
  }
>(({ variant = "primary", className = "", loading = false, disabled, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-unisanta-navy/25 ${VARIANT_CLASSES[variant]} ${DISABLED_CLASSES} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
Button.displayName = "Button";
