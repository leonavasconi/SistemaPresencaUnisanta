"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/lib/toast";

/**
 * Exporta as presenças do evento (CSV/XLSX).
 *
 * Busca o arquivo com `fetch` em vez de deixar o navegador seguir o link: só
 * assim dá para mostrar o spinner enquanto o servidor monta a planilha e
 * avisar quando o arquivo ficou pronto (ou se deu errado).
 */
export function ExportButton({ eventId }: { eventId: string }) {
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [loading, setLoading] = useState(false);

  async function exportar() {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/admin/events/${eventId}/export?format=${format}`);
      const disposition = response.headers.get("Content-Disposition");
      // Sem o cabeçalho de download, o que voltou não é o arquivo (ex.: a
      // sessão expirou e a resposta é a tela de login).
      if (!response.ok || !disposition) throw new Error("resposta inesperada");

      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `presencas.${format}`;
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      showToast("Arquivo exportado.");
    } catch {
      showToast("Não foi possível exportar agora. Tente novamente.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        value={format}
        onChange={(e) => setFormat(e.target.value as "csv" | "xlsx")}
        disabled={loading}
        aria-label="Formato do arquivo"
        className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-unisanta-navy focus:ring-2 focus:ring-unisanta-navy/15 disabled:opacity-60"
      >
        <option value="csv">CSV</option>
        <option value="xlsx">XLSX</option>
      </select>
      <Button type="button" onClick={exportar} loading={loading} className="w-full sm:w-auto">
        {!loading && <Download className="h-4 w-4" />}
        {loading ? "Gerando..." : "Exportar"}
      </Button>
    </div>
  );
}
