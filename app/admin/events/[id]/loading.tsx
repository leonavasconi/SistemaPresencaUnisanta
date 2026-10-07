import { TitleSkeleton } from "@/components/PageSkeleton";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

// Painel do evento: QR, área, contagem por momento e a tabela de presenças.
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8"
    >
      <Skeleton className="h-4 w-48" />
      <TitleSkeleton />
      <Card className="flex flex-col items-center gap-4 p-6 sm:flex-row">
        <Skeleton className="h-[140px] w-[140px] shrink-0 rounded-xl" />
        <div className="flex w-full flex-1 flex-col gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-11 w-40 rounded-xl" />
        </div>
      </Card>
      <Skeleton className="h-64 rounded-2xl" />
      <Card className="flex flex-col divide-y divide-zinc-100">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center justify-between gap-3 px-5 py-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-6" />
          </div>
        ))}
      </Card>
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  );
}
