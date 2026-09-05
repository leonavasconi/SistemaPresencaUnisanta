import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from "react";
import type { LucideIcon } from "lucide-react";

// `aria-invalid` é o que pinta a borda de erro: assim o estado visual e o
// estado anunciado por leitores de tela vêm sempre do mesmo atributo, sem
// chance de um dizer uma coisa e o outro dizer outra.
const baseClass =
  "h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-[border-color,box-shadow,background-color] hover:border-zinc-300 focus:border-unisanta-navy focus:ring-4 focus:ring-unisanta-navy/10 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 aria-[invalid=true]:border-unisanta-red aria-[invalid=true]:focus:border-unisanta-red aria-[invalid=true]:focus:ring-unisanta-red/10";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { icon?: LucideIcon }
>(({ icon: Icon, className = "", ...props }, ref) => {
  if (!Icon) {
    return <input ref={ref} className={`${baseClass} ${className}`} {...props} />;
  }
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input ref={ref} className={`${baseClass} pl-10 ${className}`} {...props} />
    </div>
  );
});
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = "", ...props }, ref) => (
  <textarea ref={ref} className={`${baseClass} h-24 resize-none py-2.5 ${className}`} {...props} />
));
Textarea.displayName = "Textarea";

export const Label = ({
  children,
  required = false,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  /** Liga o rótulo ao campo — sem isso, clicar no texto não foca o input. */
  htmlFor?: string;
}) => (
  <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-700">
    {children}
    {required && (
      <span className="ml-0.5 text-unisanta-red" aria-hidden="true">
        *
      </span>
    )}
  </label>
);
