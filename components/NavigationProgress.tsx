"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Barra fina no topo enquanto uma navegação entre páginas carrega.
 *
 * O App Router não expõe eventos de navegação, então a barra começa no clique
 * de um link interno e termina quando o caminho (`pathname`) muda — derivado
 * no render, sem efeito. Se a navegação nunca terminar, a própria animação
 * some sozinha depois de ~12 s (ver `nav-progress` em globals.css).
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [nav, setNav] = useState<{ from: string; id: number } | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Mesmo caminho (só muda a query ou o hash): o pathname não vai mudar
      // para encerrar a barra, então nem começamos.
      if (url.pathname === window.location.pathname) return;

      setNav((previous) => ({ from: window.location.pathname, id: (previous?.id ?? 0) + 1 }));
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!nav || nav.from !== pathname) return null;

  return (
    // `key` reinicia a animação a cada nova navegação.
    <div
      key={nav.id}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
    >
      <div
        className="h-full animate-nav-progress rounded-r-full bg-unisanta-red shadow-[0_0_8px_rgba(218,37,28,0.5)]"
        style={{ width: "40%" }}
      />
    </div>
  );
}
