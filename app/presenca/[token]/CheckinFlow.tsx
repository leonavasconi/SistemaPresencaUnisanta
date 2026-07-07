"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, CheckCircle2, AlertTriangle, XCircle, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getDeviceFingerprint } from "@/lib/device/fingerprint";
import { FaceCapture } from "@/components/FaceCapture";
import { PageBackground } from "@/components/ui/PageBackground";

type Stage = "localizando" | "pronto-para-captura" | "enviando" | "aprovado" | "rejeitado" | "erro";

const REJECTION_MESSAGES: Record<string, string> = {
  checkpoint_nao_encontrado: "QR Code inválido ou expirado.",
  fora_da_janela_de_horario: "Este momento de presença não está aberto agora.",
  evento_nao_encontrado: "Evento não encontrado.",
  fora_da_area_do_evento: "Você precisa estar no local do evento para registrar presença.",
  presenca_ja_registrada: "Sua presença neste momento já foi registrada.",
  dispositivo_ja_utilizado_por_outro_aluno: "Este aparelho já foi usado para registrar outro aluno neste evento.",
  aluno_nao_cadastrado: "Cadastro não encontrado. Finalize seu cadastro facial primeiro.",
  biometria_nao_confere: "Não foi possível confirmar sua identidade pela biometria facial. Tente novamente com boa iluminação.",
  nao_autenticado: "Sua sessão expirou. Faça login novamente.",
  payload_invalido: "Dados inválidos enviados pelo aplicativo.",
};

export function CheckinFlow({ token }: { token: string }) {
  const [stage, setStage] = useState<Stage>("localizando");
  const [message, setMessage] = useState<string | null>(null);
  const [checkpointLabel, setCheckpointLabel] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      queueMicrotask(() => {
        setStage("erro");
        setMessage("Este navegador não suporta geolocalização.");
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setStage("pronto-para-captura");
      },
      () => {
        setStage("erro");
        setMessage("Não foi possível obter sua localização. Ative o GPS e permita o acesso.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, []);

  async function handleFaceCaptured(descriptor: number[]) {
    if (!coords) return;
    setStage("enviando");

    const supabase = createClient();
    const deviceHash = await getDeviceFingerprint();

    const { data, error } = await supabase.functions.invoke("checkin", {
      body: {
        qrToken: token,
        descriptor,
        latitude: coords.lat,
        longitude: coords.lng,
        accuracyMeters: coords.accuracy,
        deviceHash,
      },
    });

    if (error || !data) {
      setStage("erro");
      setMessage("Erro de conexão. Tente novamente.");
      return;
    }

    if (data.status === "approved") {
      setCheckpointLabel(data.checkpoint);
      setStage("aprovado");
    } else {
      setMessage(REJECTION_MESSAGES[data.reason] ?? "Não foi possível registrar sua presença.");
      setStage("rejeitado");
    }
  }

  return (
    <PageBackground>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl border border-zinc-100 bg-white/90 p-8 text-center shadow-xl shadow-zinc-900/5 backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-zinc-50 shadow-sm ring-1 ring-zinc-100">
            <Image src="/logo-unisanta.png" alt="Unisanta" width={44} height={44} />
          </div>

          {stage === "localizando" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <MapPin className="h-8 w-8 animate-pulse text-unisanta-navy" />
              <p className="text-sm text-zinc-500">Obtendo sua localização...</p>
            </div>
          )}

          {stage === "pronto-para-captura" && (
            <FaceCapture
              instructions="Confirme sua identidade para registrar presença"
              onCaptured={handleFaceCaptured}
            />
          )}

          {stage === "enviando" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-unisanta-navy" />
              <p className="text-sm text-zinc-500">Validando presença...</p>
            </div>
          )}

          {stage === "aprovado" && (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="font-medium text-zinc-800">Presença registrada com sucesso!</p>
              <p className="text-sm text-zinc-500">{checkpointLabel}</p>
            </>
          )}

          {stage === "rejeitado" && (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
              <p className="font-medium text-unisanta-red">Não foi possível registrar</p>
              <p className="text-sm text-zinc-500">{message}</p>
            </>
          )}

          {stage === "erro" && (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <XCircle className="h-8 w-8 text-unisanta-red" />
              </div>
              <p className="text-sm text-unisanta-red">{message}</p>
            </>
          )}
        </div>
      </div>
    </PageBackground>
  );
}
