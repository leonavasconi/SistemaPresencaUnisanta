import { type ButtonHTMLAttributes, forwardRef } from "react";

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

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ variant = "primary", className = "", ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
});
Button.displayName = "Button";
