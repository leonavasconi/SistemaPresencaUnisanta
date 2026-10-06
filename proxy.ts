import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // O proxy chama o Supabase Auth em toda requisição que passa por ele.
  // Arquivos estáticos (inclusive os modelos de reconhecimento facial em
  // /models, ~7 MB por aluno) não precisam de sessão e ficam de fora.
  matcher: [
    "/((?!_next/static|_next/image|models/|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt|woff2?)$).*)",
  ],
};
