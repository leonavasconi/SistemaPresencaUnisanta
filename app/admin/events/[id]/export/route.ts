import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { formatDateFileStamp, formatDateTimeBR } from "@/lib/datetime";

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

/** Deixa o nome do evento seguro para usar em nome de arquivo (sem acentos, espaços viram hífen). */
function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "evento"
  );
}

const HEADER = ["Nome", "RA", "Curso", "Momento", "Registrado em", "Situação"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: eventId } = await params;
  const format = new URL(request.url).searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("eventos")
    .select("nome")
    .eq("id", eventId)
    .maybeSingle();

  const { data: records } = await supabase
    .from("registros_presenca")
    .select(
      "registrado_em, situacao, momentos_presenca(rotulo), alunos(nome_completo, matricula, curso)",
    )
    .eq("evento_id", eventId)
    .order("registrado_em", { ascending: true });

  const rows = (records ?? []).map((r) => {
    const student = Array.isArray(r.alunos) ? r.alunos[0] : r.alunos;
    const checkpoint = Array.isArray(r.momentos_presenca) ? r.momentos_presenca[0] : r.momentos_presenca;
    return [
      student?.nome_completo,
      student?.matricula || "-",
      student?.curso,
      checkpoint?.rotulo,
      formatDateTimeBR(new Date(r.registrado_em)),
      r.situacao,
    ];
  });

  const filename = `lista-presenca-${slugify(event?.nome ?? "")}-${formatDateFileStamp(new Date())}`;

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Presença");
    sheet.addRow(HEADER).font = { bold: true };
    for (const row of rows) sheet.addRow(row);
    sheet.columns.forEach((column) => {
      column.width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  const csv = [HEADER, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
