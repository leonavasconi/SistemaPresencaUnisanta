"use client";

import { useState } from "react";
import Link from "next/link";
import { ScanFace, CheckCircle2, ArrowLeft } from "lucide-react";
import { FaceCapture } from "@/components/FaceCapture";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { updateFaceDescriptor } from "../actions";

/**
 * Recaptura do rosto, para quem fica travado no check-in.
 *
 * A câmera só é ligada depois do clique: montar o `FaceCapture` baixa ~7 MB
 * de modelos, e quem abre esta página sem precisar não deveria pagar por isso.
 */
export function AtualizarRosto({ voltarPara }: { voltarPara: string }) {
  const [etapa, setEtapa] = useState<"inicio" | "capturando" | "salvando" | "pronto">("inicio");
  const [erro, setErro] = useState<string | null>(null);

  async function aoCapturar(descriptor: number[]) {
    setEtapa("salvando");
    setErro(null);

    const resultado = await updateFaceDescriptor(descriptor);

    if (resultado.error) {
      setErro(resultado.error);
      setEtapa("capturando");
      return;
    }
    setEtapa("pronto");
  }

  if (etapa === "pronto") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-medium text-zinc-800">Rosto atualizado!</p>
          <p className="text-sm leading-relaxed text-zinc-600">
            Agora leia o QR Code do evento de novo para registrar sua presença.
          </p>
        </div>
        <Link href={voltarPara} className="w-full max-w-xs">
          <Button type="button" variant="primary" className="w-full">
            Voltar aos eventos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {erro && <Alert>{erro}</Alert>}

      {etapa === "inicio" && (
        <>
          <p className="text-sm leading-relaxed text-zinc-600">
            Se o sistema não está reconhecendo seu rosto no check-in, capture uma foto
            nova <strong>aqui mesmo, no local do evento</strong>. A foto do cadastro pode
            ter sido feita com outra iluminação ou outro aparelho, e é isso que atrapalha
            a comparação.
          </p>
          <ul className="flex flex-col gap-1.5 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
            <li>• Fique de frente para a câmera, com o rosto centralizado</li>
            <li>• Procure um lugar com luz no rosto, não atrás de você</li>
            <li>• Tire boné, óculos escuros e máscara</li>
          </ul>
          <Button type="button" variant="secondary" onClick={() => setEtapa("capturando")}>
            <ScanFace className="h-4 w-4" />
            Capturar meu rosto agora
          </Button>
          <Link
            href={voltarPara}
            className="flex items-center justify-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-unisanta-navy"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Link>
        </>
      )}

      {(etapa === "capturando" || etapa === "salvando") && (
        <>
          <FaceCapture
            instructions="Posicione seu rosto no centro e capture"
            onCaptured={aoCapturar}
          />
          {etapa === "salvando" && (
            <p className="text-center text-sm text-zinc-500">Salvando...</p>
          )}
        </>
      )}
    </div>
  );
}
