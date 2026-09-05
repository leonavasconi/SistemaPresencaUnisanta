import { AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Mensagem de erro ou sucesso no topo de um formulário. Antes cada tela de
 * autenticação repetia o mesmo parágrafo com as classes na mão; aqui a
 * aparência e o papel de acessibilidade ficam num lugar só.
 *
 * `role="alert"` faz leitores de tela anunciarem a mensagem assim que ela
 * aparece — importante porque o erro chega depois de um redirect, quando o
 * foco do usuário já não está no formulário.
 */
export function Alert({
  variant = "error",
  children,
}: {
  variant?: "error" | "success";
  children: React.ReactNode;
}) {
  const isError = variant === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      role="alert"
      className={`mb-5 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${
        isError
          ? "border-red-100 bg-red-50 text-unisanta-red"
          : "border-emerald-100 bg-emerald-50 text-emerald-700"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}
