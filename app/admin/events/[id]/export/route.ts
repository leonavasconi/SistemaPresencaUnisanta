import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    .from("attendance_records")
    .select(
      "recorded_at, distance_m, status, event_checkpoints(label), students(full_name, matricula, course)",
    )
    .eq("event_id", eventId)
    .order("recorded_at", { ascending: true });

  const header = ["Nome", "Matrícula", "Curso", "Momento", "Registrado em", "Distância (m)", "Status"];
  const rows = (records ?? []).map((r) => {
    const student = Array.isArray(r.students) ? r.students[0] : r.students;
    const checkpoint = Array.isArray(r.event_checkpoints) ? r.event_checkpoints[0] : r.event_checkpoints;
    return [
      student?.full_name,
      student?.matricula,
      student?.course,
      checkpoint?.label,
      new Date(r.recorded_at).toLocaleString("pt-BR"),
      Math.round(r.distance_m),
      r.status,
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
