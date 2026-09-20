import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/Card";
import { getGeofencePresets } from "../actions";
import { NewEventForm } from "./NewEventForm";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const presets = await getGeofencePresets();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <Link
        href="/admin/events"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-unisanta-navy"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para a tela inicial
      </Link>

      <PageHeader title="Novo evento" subtitle="Defina os dados, a área e os momentos de presença" />
      <NewEventForm error={error} presets={presets} />
    </div>
  );
}
