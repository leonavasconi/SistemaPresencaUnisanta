"use client";

import { useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { Input, Label } from "@/components/ui/Input";
import { parseSaoPauloDateTime } from "@/lib/datetime";

/**
 * Coleta a data e o horário do evento.
 *
 * O `<input type="datetime-local">` que existia antes obrigava a preencher a
 * data inteira duas vezes — e todo evento aqui começa e termina no mesmo
 * dia (cada palestra/sessão vira seu próprio evento, mesmo compartilhando
 * o mesmo espaço em horários diferentes). Aqui a data é informada uma vez
 * e os horários são dois campos curtos.
 *
 * Data e hora são estado DESTE componente, não derivados de `startsAt`. A
 * diferença importa: `startsAt` só existe quando as duas partes estão
 * preenchidas, então derivá-lo apagaria a data que a pessoa acabou de digitar
 * enquanto a hora ainda estivesse vazia.
 *
 * O valor entregue ao formulário continua sendo `YYYY-MM-DDTHH:mm` nos campos
 * `startsAt` e `endsAt`, exatamente como a Server Action já espera: isto é
 * uma troca de interface, não de contrato.
 */

function juntar(data: string, hora: string): string {
  return data && hora ? `${data}T${hora}` : "";
}

/**
 * Quanto tempo o evento dura, em texto curto ("1h 30min").
 * Devolve `null` enquanto não houver um intervalo válido — o organizador
 * confere assim, de relance, se digitou os horários certos.
 */
function formatarDuracao(inicio: string, fim: string): string | null {
  if (!inicio || !fim) return null;

  const ms = parseSaoPauloDateTime(fim).getTime() - parseSaoPauloDateTime(inicio).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const totalMinutos = Math.round(ms / 60_000);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;

  const partes: string[] = [];
  if (horas) partes.push(`${horas}h`);
  if (minutos) partes.push(`${minutos}min`);
  return partes.join(" ");
}

export function EventSchedule({
  startsAt,
  endsAt,
  onChange,
}: {
  startsAt: string;
  endsAt: string;
  onChange: (startsAt: string, endsAt: string) => void;
}) {
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");

  /** Recalcula e publica os dois valores completos para o formulário. */
  function publicar(next: Partial<{ data: string; horaInicio: string; horaFim: string }>) {
    const d = next.data ?? data;
    const hi = next.horaInicio ?? horaInicio;
    const hf = next.horaFim ?? horaFim;

    if (next.data !== undefined) setData(next.data);
    if (next.horaInicio !== undefined) setHoraInicio(next.horaInicio);
    if (next.horaFim !== undefined) setHoraFim(next.horaFim);

    onChange(juntar(d, hi), juntar(d, hf));
  }

  const duracao = formatarDuracao(startsAt, endsAt);
  const fimAntesDoInicio =
    Boolean(startsAt) && Boolean(endsAt) &&
    parseSaoPauloDateTime(endsAt) <= parseSaoPauloDateTime(startsAt);

  return (
    <div className="flex flex-col gap-3">
      {/* A data ocupa a linha inteira e os horários dividem a seguinte. Antes
          os três dividiam a mesma linha, e cada campo de hora ficava com um
          quarto da largura — estreito demais para o próprio valor caber. */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="eventDate" required>
          Data do evento
        </Label>
        <Input
          id="eventDate"
          icon={CalendarDays}
          type="date"
          required
          value={data}
          onChange={(e) => publicar({ data: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startTime" required>
            Início
          </Label>
          <Input
            id="startTime"
            icon={Clock}
            type="time"
            required
            value={horaInicio}
            onChange={(e) => publicar({ horaInicio: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endTime" required>
            Término
          </Label>
          <Input
            id="endTime"
            icon={Clock}
            type="time"
            required
            value={horaFim}
            onChange={(e) => publicar({ horaFim: e.target.value })}
            aria-invalid={fimAntesDoInicio}
          />
        </div>
      </div>

      {/* Quanto tempo o evento dura, calculado a partir do início e do término. */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        Duração:
        {duracao ? (
          <span className="rounded-md bg-unisanta-navy/10 px-2 py-0.5 text-xs font-semibold text-unisanta-navy">
            {duracao}
          </span>
        ) : (
          <span className="text-zinc-400">—</span>
        )}
      </div>

      {fimAntesDoInicio && (
        <p className="text-xs text-unisanta-red">O término precisa ser depois do início.</p>
      )}

      {/* O que a Server Action lê — mesmo formato de antes. */}
      <input type="hidden" name="startsAt" value={startsAt} readOnly />
      <input type="hidden" name="endsAt" value={endsAt} readOnly />
    </div>
  );
}
