import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatDateTimeBR } from "@/lib/datetime";

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const { data: records } = await supabase
    .from("registros_presenca")
    .select(
      "registrado_em, distancia_m, situacao, momentos_presenca(rotulo), alunos(nome_completo, matricula, curso)",
    )
    .eq("evento_id", eventId)
    .order("registrado_em", { ascending: true });

  const header = ["Nome", "RA", "Curso", "Momento", "Registrado em", "Distância (m)", "Situação"];
  const rows = (records ?? []).map((r) => {
    const student = Array.isArray(r.alunos) ? r.alunos[0] : r.alunos;
    const checkpoint = Array.isArray(r.momentos_presenca) ? r.momentos_presenca[0] : r.momentos_presenca;
    return [
      student?.nome_completo,
      student?.matricula,
      student?.curso,
      checkpoint?.rotulo,
      formatDateTimeBR(new Date(r.registrado_em)),
      Math.round(r.distancia_m),
      r.situacao,
    ];
  });

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="presenca-${eventId}.csv"`,
    },
  });
}
