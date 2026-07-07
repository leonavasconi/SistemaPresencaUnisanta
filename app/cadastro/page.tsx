import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CadastroWizard } from "./CadastroWizard";

export default async function CadastroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: aluno } = await supabase
      .from("alunos")
      .select("descritor_facial, excluido_em")
      .eq("id", user.id)
      .maybeSingle();

    const isEnrolled =
      !!aluno &&
      !aluno.excluido_em &&
      Array.isArray(aluno.descritor_facial) &&
      aluno.descritor_facial.length > 0;

    if (isEnrolled) {
      redirect("/eventos");
    }
  }

  return <CadastroWizard />;
}
