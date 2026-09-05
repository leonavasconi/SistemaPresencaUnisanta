"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

/**
 * Recolhe a sessão que o link de recuperação traz no fragmento da URL.
 *
 * O Supabase devolve `#access_token=...&refresh_token=...` — e fragmento não
 * é enviado ao servidor, então nenhuma página server-side consegue lê-lo.
 * Este componente roda no navegador, entrega os tokens ao cliente Supabase
 * (que os grava nos cookies lidos pelo servidor) e recarrega a rota, para que
 * a página volte a renderizar já com a sessão ativa.
 *
 * O fragmento é apagado da barra de endereço logo em seguida: ele contém um
 * token de acesso válido, que não deve ficar no histórico do navegador.
 */
export function RecuperarSessaoDoLink() {
  const router = useRouter();
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    const fragmento = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = fragmento.get("access_token");
    const refreshToken = fragmento.get("refresh_token");
    const erro = fragmento.get("error_description") ?? fragmento.get("error");

    let cancelado = false;

    if (erro || !accessToken || !refreshToken) {
      // Adiado para fora do próprio effect, como no CheckinFlow: marcar o
      // estado durante a execução dele dispara um render extra imediato.
      queueMicrotask(() => {
        if (!cancelado) setFalhou(true);
      });
      return () => {
        cancelado = true;
      };
    }

    const supabase = createClient();

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (cancelado) return;
        if (error) {
          setFalhou(true);
          return;
        }
        window.history.replaceState(null, "", window.location.pathname);
        router.refresh();
      });

    return () => {
      cancelado = true;
    };
  }, [router]);

  if (falhou) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <AlertTriangle className="h-7 w-7 text-amber-600" />
        </div>
        <p className="text-sm leading-relaxed text-zinc-600">
          Este link de redefinição expirou ou já foi usado. Peça um novo para continuar.
        </p>
        <Link href="/esqueci-senha" className="w-full">
          <Button type="button" variant="primary" className="w-full">
            Pedir novo link
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <Loader2 className="h-7 w-7 animate-spin text-unisanta-navy" />
      <p className="text-sm text-zinc-500">Validando seu link...</p>
    </div>
  );
}
