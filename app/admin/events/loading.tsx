import { TitleSkeleton } from "@/components/PageSkeleton";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

// O cabeçalho do painel vem do layout do admin e continua na tela; só o
// conteúdo da página é trocado pelo esqueleto.
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8"
    >
      <TitleSkeleton />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((card) => (
          <Card key={card} className="flex h-28 flex-col gap-3 p-5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="mt-auto h-3.5 w-1/2" />
          </Card>
        ))}
      </div>
    </div>
  );
}
