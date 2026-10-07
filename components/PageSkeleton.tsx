import { ParticipantHeader } from "@/components/ParticipantHeader";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Esqueletos dos `loading.tsx`. O Next mostra o do segmento no mesmo instante
 * da navegação e o troca pela página real quando o servidor termina de buscar
 * os dados — por isso eles imitam o formato de cada tela (cabeçalho, título e
 * cards), para o conteúdo não "pular" quando chega.
 */

/** Título + subtítulo, como o `PageHeader`. */
export function TitleSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="h-4 w-64 max-w-full" />
    </div>
  );
}

/** Moldura das telas do participante: cabeçalho de verdade (já é estático) + conteúdo em esqueleto. */
export function ParticipantPageSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <ParticipantHeader />
      <main
        role="status"
        aria-label="Carregando"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8"
      >
        <TitleSkeleton />
        {children}
      </main>
    </div>
  );
}

/** Card de evento da lista do participante: nome, data e uma linha de momento. */
export function EventCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </Card>
  );
}

/** Linha do histórico de presenças. */
export function RecordRowSkeleton() {
  return (
    <Card className="flex items-center gap-4 p-4">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </Card>
  );
}
