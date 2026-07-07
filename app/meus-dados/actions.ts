"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function deleteMyData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Apaga dados pessoais e a biometria facial imediatamente. O registro em
  // `students` é mantido (anonimizado) para que o histórico de presenças
  // continue íntegro para fins de auditoria (3.6.c da especificação),
  // conforme a LGPD permite quando há finalidade legítima de retenção.
  await supabase
    .from("students")
    .update({
      full_name: "Aluno removido",
      matricula: `removido-${user!.id.slice(0, 8)}`,
      course: "",
      face_descriptor: [],
      deleted_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  await supabase.from("consent_logs").insert({
    student_id: user.id,
    consent_version: "n/a",
    action: "revoked",
  });

  await supabase.auth.signOut();
  redirect("/");
}
