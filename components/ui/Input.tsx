import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from "react";
import type { LucideIcon } from "lucide-react";

const baseClass =
  "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-800 placeholder:text-zinc-400 outline-none transition-colors focus:border-unisanta-navy focus:ring-2 focus:ring-unisanta-navy/15";

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

export const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-sm font-medium text-zinc-700">{children}</label>
);
