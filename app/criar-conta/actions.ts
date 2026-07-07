"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const fullName = String(formData.get("fullName"));
  const institution = String(formData.get("institution"));
  const ra = String(formData.get("ra"));
  const course = String(formData.get("course"));
  const sala = String(formData.get("sala") ?? "");
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    redirect(`/criar-conta?error=${encodeURIComponent(error?.message ?? "Não foi possível criar a conta")}`);
  }

  const { error: alunoError } = await supabase.from("alunos").insert({
    id: data.user!.id,
    nome_completo: fullName,
    instituicao: institution,
    matricula: ra,
    curso: course,
    sala: sala || null,
    descritor_facial: [],
  });

  if (alunoError) {
    const message = alunoError.message.includes("students_matricula_key")
      ? "Este RA já está cadastrado em outra conta."
      : alunoError.message;
    redirect(`/criar-conta?error=${encodeURIComponent(message)}`);
  }

  redirect("/cadastro");
}
