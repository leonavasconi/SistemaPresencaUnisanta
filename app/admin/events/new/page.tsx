import { PageHeader } from "@/components/ui/Card";
import { NewEventForm } from "./NewEventForm";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Novo evento" subtitle="Defina os dados e o local do evento" />
      <NewEventForm error={error} />
    </div>
  );
}
