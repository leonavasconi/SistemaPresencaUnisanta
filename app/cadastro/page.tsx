import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/auth";
import { cadastroEstaCompleto } from "@/lib/enrollment";
import { CadastroWizard } from "./CadastroWizard";

export default async function CadastroPage() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (user) {
    // Mesma regra usada pelo middleware (lib/enrollment.ts): quem já concluiu
    // não precisa repetir o consentimento nem a captura do rosto.
    if ((await cadastroEstaCompleto(supabase, user.id)) === true) {
      redirect("/eventos");
    }
  }

  return <CadastroWizard />;
}
