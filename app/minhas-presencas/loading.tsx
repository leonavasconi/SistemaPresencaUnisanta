import { ParticipantPageSkeleton, RecordRowSkeleton } from "@/components/PageSkeleton";

export default function Loading() {
  return (
    <ParticipantPageSkeleton>
      <div className="flex flex-col gap-3">
        <RecordRowSkeleton />
        <RecordRowSkeleton />
        <RecordRowSkeleton />
        <RecordRowSkeleton />
      </div>
    </ParticipantPageSkeleton>
  );
}
