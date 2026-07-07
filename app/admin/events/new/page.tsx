import { NewEventForm } from "./NewEventForm";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-unisanta-navy">Novo evento</h1>
      <NewEventForm error={error} />
    </div>
  );
}
