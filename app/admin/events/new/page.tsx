import { PageHeader } from "@/components/ui/Card";
import { NewEventForm } from "./NewEventForm";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <PageHeader title="Novo evento" subtitle="Defina os dados, a área e os momentos de presença" />
      <NewEventForm error={error} />
    </div>
  );
}
