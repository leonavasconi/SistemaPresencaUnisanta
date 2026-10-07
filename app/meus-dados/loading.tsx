import { ParticipantPageSkeleton } from "@/components/PageSkeleton";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <ParticipantPageSkeleton>
      <Card className="max-w-lg p-6">
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="flex items-center justify-between gap-6">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </Card>
      <Skeleton className="h-36 max-w-lg rounded-2xl" />
    </ParticipantPageSkeleton>
  );
}
