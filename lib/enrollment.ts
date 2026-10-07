import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * O que conta como "cadastro concluído" para um participante.
 *
 * Criar a conta é só o primeiro passo: o acesso ao sistema depende de a
 * pessoa ter passado pelo consentimento LGPD e pela captura do rosto em
 * /cadastro. Antes disso ela não pode circular pelas telas nem tentar
 * check-in — o descritor facial é o que prova identidade no momento da
 * presença, e o consentimento é o que autoriza tratar esses dados.
 *
 * Quem decide é o BANCO, e a resposta é só "sim/não": o descritor facial (dado
 * biométrico) nunca sai do Postgres para esta checagem, que roda no proxy a
 * cada página. Concluído significa, ao mesmo tempo:
 *   - `consentimento_em` preenchido;
 *   - `excluido_em` nulo (quem pediu exclusão dos dados precisa refazer);
 *   - descritor presente. A coluna é `double precision[] NOT NULL` e "sem
 *     biometria" é gravado como array VAZIO (`'{}'`: criar-conta e exclusão de
 *     dados), então o filtro é `<> '{}'` — `is not null` seria sempre verdadeiro.
 *
 * A regra vive aqui, e não espalhada, porque é checada em dois lugares (o
 * proxy e a página de cadastro) e discordar entre eles abriria exatamente a
 * brecha que ela existe para fechar.
 *
 * Devolve `null` quando a consulta falha (timeout, banco lento): erro não é
 * "cadastro incompleto", e quem chama decide como degradar.
 */
export async function cadastroEstaCompleto(
  supabase: { from: SupabaseClient["from"] },
  participanteId: string,
): Promise<boolean | null> {
  const { data, error } = await supabase
    .from("participantes")
    .select("id")
    .eq("id", participanteId)
    .not("consentimento_em", "is", null)
    .is("excluido_em", null)
    .neq("descritor_facial", "{}")
    .maybeSingle();

  if (error) return null;
  return data !== null;
}
