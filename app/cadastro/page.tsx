import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ENROLLMENT_COLUMNS, isEnrollmentComplete } from "@/lib/enrollment";
import { CadastroWizard } from "./CadastroWizard";

export default async function CadastroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Mesma regra usada pelo middleware (lib/enrollment.ts): quem já concluiu
    // não precisa repetir o consentimento nem a captura do rosto.
    const { data: participante } = await supabase
      .from("participantes")
      .select(ENROLLMENT_COLUMNS)
      .eq("id", user.id)
      .maybeSingle();

    if (isEnrollmentComplete(participante)) {
      redirect("/eventos");
    }
  }

  return <CadastroWizard />;
}
