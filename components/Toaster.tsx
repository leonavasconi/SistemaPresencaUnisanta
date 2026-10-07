"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { FLASH_MESSAGES, TOAST_EVENT, showToast, type ToastDetail } from "@/lib/toast";

type Toast = ToastDetail & { id: number };

const DURATION_MS: Record<ToastDetail["variant"], number> = {
  success: 4000,
  error: 7000,
};

/** Lê `?ok=<chave>` deixado por uma ação de servidor, mostra o aviso e limpa a URL. */
function FlashFromUrl() {
  const searchParams = useSearchParams();
  // Em desenvolvimento o React executa o efeito duas vezes seguidas; sem isto
  // o aviso apareceria em dobro.
  const shownKey = useRef<string | null>(null);

  useEffect(() => {
    const key = searchParams.get("ok");
    if (!key) {
      shownKey.current = null;
      return;
    }
    if (shownKey.current === key) return;
    shownKey.current = key;

    const message = FLASH_MESSAGES[key];
    if (message) showToast(message);

    const url = new URL(window.location.href);
    url.searchParams.delete("ok");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [searchParams]);

  return null;
}

/**
 * `ToastList` vem antes de `FlashFromUrl` de propósito: os efeitos de
 * componentes irmãos rodam na ordem em que aparecem, e o ouvinte precisa estar
 * registrado antes de o aviso da URL ser disparado — senão ele se perde.
 */
export function Toaster() {
  return (
    <>
      <ToastList />
      {/* useSearchParams exige Suspense; o fallback vazio não aparece na tela. */}
      <Suspense fallback={null}>
        <FlashFromUrl />
      </Suspense>
    </>
  );
}

function ToastList() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    function onToast(event: Event) {
      const { message, variant } = (event as CustomEvent<ToastDetail>).detail;
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant }]);
      window.setTimeout(
        () => setToasts((current) => current.filter((t) => t.id !== id)),
        DURATION_MS[variant],
      );
    }
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => {
        const isError = toast.variant === "error";
        const Icon = isError ? AlertCircle : CheckCircle2;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-sm animate-[revelar_200ms_ease-out] items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm shadow-lg ${
              isError
                ? "border-red-100 bg-red-50 text-unisanta-red"
                : "border-emerald-100 bg-emerald-50 text-emerald-700"
            }`}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1 leading-relaxed">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
              aria-label="Fechar aviso"
              className="-mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
