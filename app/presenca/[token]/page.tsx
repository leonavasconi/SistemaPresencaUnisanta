import { createClient } from "@/lib/supabase/server";
import { CheckinFlow } from "./CheckinFlow";

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Resolve o momento pelo QR e verifica, já no servidor, se este
  // participante tem presença registrada nele. É isso que faz a página abrir
  // direto no estado "confirmada" quando o QR é lido de novo — sem pedir
  // localização nem selfie, e sem um piscar de tela até o cliente descobrir.
  const { data: checkpoint } = await supabase
    .from("momentos_presenca")
    .select("id, rotulo")
    .eq("token_qr", token)
    .maybeSingle();

  let registeredAt: string | null = null;

  if (user && checkpoint) {
    const { data: record } = await supabase
      .from("registros_presenca")
      .select("registrado_em")
      .eq("momento_id", checkpoint.id)
      .eq("participante_id", user.id)
      .maybeSingle();

    registeredAt = record?.registrado_em ?? null;
  }

  return (
    <CheckinFlow
      token={token}
      checkpointLabel={checkpoint?.rotulo ?? null}
      alreadyRegisteredAt={registeredAt}
    />
  );
}
