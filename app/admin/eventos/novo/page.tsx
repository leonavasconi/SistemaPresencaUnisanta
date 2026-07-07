import { PageHeader } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { NewEventForm } from "./NewEventForm";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: alunos } = await supabase.from("alunos").select("curso, sala");
  const isString = (v: string | null): v is string => Boolean(v);
  const cursoOptions = [...new Set((alunos ?? []).map((a) => a.curso).filter(isString))].sort();
  const salaOptions = [...new Set((alunos ?? []).map((a) => a.sala).filter(isString))].sort();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Novo evento" subtitle="Defina os dados e o local do evento" />
      <NewEventForm error={error} cursoOptions={cursoOptions} salaOptions={salaOptions} />
    </div>
  );
}
