import { EventCardSkeleton, ParticipantPageSkeleton } from "@/components/PageSkeleton";

export default function Loading() {
  return (
    <ParticipantPageSkeleton>
      <div className="flex flex-col gap-4">
        <EventCardSkeleton />
        <EventCardSkeleton />
        <EventCardSkeleton />
      </div>
    </ParticipantPageSkeleton>
  );
}
