"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { apagarCrachaDeAcesso } from "@/lib/supabase/acesso-cache-server";

export async function signOutParticipant() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await apagarCrachaDeAcesso();
  redirect("/entrar");
}
