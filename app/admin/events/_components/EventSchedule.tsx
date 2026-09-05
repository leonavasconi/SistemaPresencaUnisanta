"use client";

import { useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { Input, Label } from "@/components/ui/Input";
import { parseSaoPauloDateTime } from "@/lib/datetime";

/**
 * Coleta a data e o horário do evento.
 *
 * O `<input type="datetime-local">` que existia antes obrigava a preencher a
 * data inteira duas vezes — e quase todo evento acadêmico começa e termina no
 * mesmo dia. Aqui a data é informada uma vez, os horários são dois campos
 * curtos, e só quem realmente precisa de um evento que vira o dia marca a
 * caixa para escolher a data de término.
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

/** Soma dias a uma data AAAA-MM-DD sem esbarrar em fuso horário. */
function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Quanto tempo o evento dura, em texto curto ("1h 30min", "2 dias 4h").
 * Devolve `null` enquanto não houver um intervalo válido — o organizador
 * confere assim, de relance, se digitou os horários certos.
 */
function formatarDuracao(inicio: string, fim: string): string | null {
  if (!inicio || !fim) return null;

  const ms = parseSaoPauloDateTime(fim).getTime() - parseSaoPauloDateTime(inicio).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const totalMinutos = Math.round(ms / 60_000);
  const dias = Math.floor(totalMinutos / 1440);
  const horas = Math.floor((totalMinutos % 1440) / 60);
  const minutos = totalMinutos % 60;

  const partes: string[] = [];
  if (dias) partes.push(`${dias} ${dias === 1 ? "dia" : "dias"}`);
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
  const [dataFim, setDataFim] = useState("");
  const [variosDias, setVariosDias] = useState(false);

  /** Recalcula e publica os dois valores completos para o formulário. */
  function publicar(next: Partial<{
    data: string; horaInicio: string; horaFim: string; dataFim: string; variosDias: boolean;
  }>) {
    const d = next.data ?? data;
    const hi = next.horaInicio ?? horaInicio;
    const hf = next.horaFim ?? horaFim;
    const multi = next.variosDias ?? variosDias;
    // Sem "vários dias", o término é sempre no mesmo dia do início.
    const df = multi ? (next.dataFim ?? dataFim) : d;

    if (next.data !== undefined) setData(next.data);
    if (next.horaInicio !== undefined) setHoraInicio(next.horaInicio);
    if (next.horaFim !== undefined) setHoraFim(next.horaFim);
    if (next.dataFim !== undefined) setDataFim(next.dataFim);
    if (next.variosDias !== undefined) setVariosDias(next.variosDias);

    onChange(juntar(d, hi), juntar(df, hf));
  }

  function alternarVariosDias(marcado: boolean) {
    // Ao ligar, sugere o dia seguinte — o caso comum de evento que vira o dia.
    publicar({ variosDias: marcado, dataFim: marcado ? somarDias(data || new Date().toISOString().slice(0, 10), 1) : "" });
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

      <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          checked={variosDias}
          onChange={(e) => alternarVariosDias(e.target.checked)}
          className="h-4 w-4 accent-unisanta-navy"
        />
        O evento termina em outro dia
      </label>

      {variosDias && (
        <div className="flex animate-[revelar_200ms_ease-out] flex-col gap-1.5 sm:max-w-[calc(50%-0.375rem)]">
          <Label htmlFor="endDate" required>
            Data de término
          </Label>
          <Input
            id="endDate"
            icon={CalendarDays}
            type="date"
            required
            min={data || undefined}
            value={dataFim}
            onChange={(e) => publicar({ dataFim: e.target.value })}
            aria-invalid={fimAntesDoInicio}
          />
        </div>
      )}

      {fimAntesDoInicio && (
        <p className="text-xs text-unisanta-red">O término precisa ser depois do início.</p>
      )}

      {/* O que a Server Action lê — mesmo formato de antes. */}
      <input type="hidden" name="startsAt" value={startsAt} readOnly />
      <input type="hidden" name="endsAt" value={endsAt} readOnly />
    </div>
  );
}
