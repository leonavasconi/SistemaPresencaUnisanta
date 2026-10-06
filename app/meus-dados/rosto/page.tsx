import { redirect } from "next/navigation";
import { ParticipantHeader } from "@/components/ParticipantHeader";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/auth";
import { PageHeader, Card } from "@/components/ui/Card";
import { AtualizarRosto } from "./AtualizarRosto";

export default async function AtualizarRostoPage({
  searchParams,
}: {
  searchParams: Promise<{ voltar?: string }>;
}) {
  const { voltar } = await searchParams;
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/entrar");

  // Só caminho interno: o parâmetro vem da tela de check-in e não pode virar
  // um redirecionamento para fora do site.
  const voltarPara =
    voltar && voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "/eventos";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <ParticipantHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <PageHeader
          title="Atualizar meu rosto"
          subtitle="Para quando o check-in não reconhece você"
        />
        <Card className="p-6">
          <AtualizarRosto voltarPara={voltarPara} />
        </Card>
      </main>
    </div>
  );
}
