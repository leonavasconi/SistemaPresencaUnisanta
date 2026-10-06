"use client";

import { useState, type ReactNode } from "react";
import { Search, X, SearchX } from "lucide-react";
import { Card } from "@/components/ui/Card";

export type FilterableEvent = {
  id: string;
  /** Texto em que a busca procura (nome, descrição…). */
  searchText: string;
  encerrado: boolean;
  /** Card já renderizado pelo servidor. */
  node: ReactNode;
};

type Situacao = "todos" | "ativos" | "encerrados";

// Sem acento e sem caixa: quem digita "calculo" ou "3d" acha "Cálculo" e "3D".
function normalizar(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Busca e filtro de situação sobre uma lista que já veio inteira do servidor:
 * filtrar é só esconder cards no navegador, sem nova consulta ao banco. A
 * barra fica numa única linha para ocupar pouco espaço no celular.
 */
export function EventListFilter({
  items,
  className,
}: {
  items: FilterableEvent[];
  /** Layout da lista (coluna única, grade…). */
  className: string;
}) {
  const [query, setQuery] = useState("");
  const [situacao, setSituacao] = useState<Situacao>("todos");

  const termo = normalizar(query.trim());
  const visiveis = items.filter((item) => {
    if (situacao === "ativos" && item.encerrado) return false;
    if (situacao === "encerrados" && !item.encerrado) return false;
    return termo === "" || normalizar(item.searchText).includes(termo);
  });

  // Separador antes do primeiro encerrado, só quando os dois grupos aparecem.
  const firstEndedIndex = visiveis.findIndex((item) => item.encerrado);
  const showEndedLabel = firstEndedIndex > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar evento"
            aria-label="Buscar evento"
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-9 text-sm text-zinc-900 outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400 hover:border-zinc-300 focus:border-unisanta-navy focus:ring-4 focus:ring-unisanta-navy/10 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={situacao}
          onChange={(e) => setSituacao(e.target.value as Situacao)}
          aria-label="Filtrar por situação"
          className="h-10 shrink-0 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none transition-[border-color,box-shadow] hover:border-zinc-300 focus:border-unisanta-navy focus:ring-4 focus:ring-unisanta-navy/10"
        >
          <option value="todos">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="encerrados">Encerrados</option>
        </select>
      </div>

      {visiveis.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <SearchX className="h-7 w-7 text-zinc-300" />
          <p className="text-sm text-zinc-500">
            {query.trim()
              ? `Nenhum evento encontrado para “${query.trim()}”.`
              : "Nenhum evento nesta situação."}
          </p>
        </Card>
      ) : (
        <div className={className}>
          {visiveis.map((item, index) => (
            <FragmentWithLabel key={item.id} label={showEndedLabel && index === firstEndedIndex}>
              {item.node}
            </FragmentWithLabel>
          ))}
        </div>
      )}
    </div>
  );
}

function FragmentWithLabel({ label, children }: { label: boolean; children: ReactNode }) {
  return (
    <>
      {label && (
        <p className="col-span-full pt-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
          Encerrados
        </p>
      )}
      {children}
    </>
  );
}
