"use server";

import { createClient } from "@/lib/supabase/server";
import { CONSENT_VERSION } from "@/lib/consent";

export type EnrollmentInput = {
  fullName: string;
  institution: string;
  matricula: string;
  course: string;
  descriptor: number[];
};

export async function saveEnrollment(input: EnrollmentInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const now = new Date().toISOString();
  const ip = null; // capturado pelo proxy/edge no futuro, se necessário

  const { error: studentError } = await supabase.from("students").upsert({
    id: user.id,
    full_name: input.fullName,
    institution: input.institution,
    matricula: input.matricula,
    course: input.course,
    face_descriptor: input.descriptor,
    consent_at: now,
    consent_version: CONSENT_VERSION,
  });

  if (studentError) {
    return { error: studentError.message };
  }

  await supabase.from("consent_logs").insert({
    student_id: user.id,
    consent_version: CONSENT_VERSION,
    action: "granted",
    ip_address: ip,
  });

  return { error: null };
}
