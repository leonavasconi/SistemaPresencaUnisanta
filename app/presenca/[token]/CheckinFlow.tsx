"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle, XCircle, MapPin, ScanFace } from "lucide-react";
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getDeviceFingerprint } from "@/lib/device/fingerprint";
import { FaceCapture } from "@/components/FaceCapture";
import { PageBackground } from "@/components/ui/PageBackground";
import { Button } from "@/components/ui/Button";
import { PermissionModal } from "@/components/ui/PermissionModal";
import { formatDateTimeBR } from "@/lib/datetime";

type Stage =
  | "localizando"
  | "pronto-para-captura"
  | "enviando"
  | "tentando-novamente"
  | "aprovado"
  | "ja-registrado"
  | "rejeitado"
  | "erro";

const REJECTION_MESSAGES: Record<string, string> = {
  checkpoint_nao_encontrado: "QR Code inválido ou expirado.",
  fora_da_janela_de_horario: "Este momento de presença não está aberto agora.",
  janela_conflitante_outro_evento:
    "Você já registrou presença em outro evento com horário conflitante com este momento.",
  evento_nao_encontrado: "Evento não encontrado.",
  area_nao_configurada:
    "Este evento ainda não teve sua área de check-in configurada. Procure o organizador.",
  fora_da_area_do_evento:
    "Você está fora da área do evento. Aproxime-se do local para registrar presença.",
  dispositivo_ja_utilizado_por_outro_participante:
    "Este aparelho já foi usado para registrar outro participante neste evento.",
  participante_nao_cadastrado:
    "Cadastro não encontrado. Finalize seu cadastro facial primeiro.",
  biometria_nao_confere:
    "Não foi possível confirmar sua identidade pela biometria facial. Tente novamente com boa iluminação.",
  nao_autenticado: "Sua sessão expirou. Faça login novamente.",
  payload_invalido: "Dados inválidos enviados pelo aplicativo.",
  erro_ao_gravar: "Não foi possível gravar sua presença. Tente novamente.",
};

// Envio resiliente ao pico: cada tentativa tem prazo próprio e só falhas de
// infraestrutura são repetidas. Respostas de negócio (aprovado, já registrado,
// recusado) são definitivas e nunca reenviadas.
const MAX_ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 12_000;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_CAP_MS = 8_000;

const OVERLOADED_MESSAGE =
  "O servidor está sobrecarregado no momento. Aguarde 1 minuto e toque em Tentar novamente. Não é preciso recarregar a página.";

/** Backoff exponencial com jitter total: evita que todos os alunos retentem juntos. */
function backoffDelayMs(failedAttempt: number) {
  const ceiling = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** (failedAttempt - 1));
  return Math.random() * ceiling;
}

/** Espera `ms`; devolve false se foi cancelada antes (a tela foi fechada). */
function sleep(ms: number, signal: AbortSignal) {
  return new Promise<boolean>((resolve) => {
    if (signal.aborted) return resolve(false);
    const onAbort = () => {
      clearTimeout(timer);
      resolve(false);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve(true);
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Falha de infraestrutura que vale repetir: timeout/rede (o abort do timeout
 * chega como FunctionsFetchError), erro do relay, 5xx e 429. O servidor
 * responde as recusas de negócio com HTTP 200, então não passam por aqui.
 */
function isTransientError(error: unknown) {
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) return true;
  if (error instanceof FunctionsHttpError) {
    const status = (error.context as Response).status;
    return status >= 500 || status === 429;
  }
  return false;
}

/** Gateway recusou o token (401): sessão inválida, repetir não adianta. */
function isUnauthorizedError(error: unknown) {
  return error instanceof FunctionsHttpError && (error.context as Response).status === 401;
}

export function CheckinFlow({
  token,
  checkpointLabel: initialCheckpointLabel,
  alreadyRegisteredAt,
}: {
  token: string;
  checkpointLabel: string | null;
  alreadyRegisteredAt: string | null;
}) {
  // Quando o servidor já sabe que há presença registrada, a tela abre nesse
  // estado e nem chega a pedir localização ou câmera.
  const [stage, setStage] = useState<Stage>(
    alreadyRegisteredAt ? "ja-registrado" : "localizando",
  );
  const [message, setMessage] = useState<string | null>(null);
  // Guardado além da mensagem porque a saída oferecida depende do motivo:
  // só a falha de biometria leva à recaptura do rosto.
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [checkpointLabel, setCheckpointLabel] = useState<string | null>(initialCheckpointLabel);
  const [registeredAt, setRegisteredAt] = useState<string | null>(alreadyRegisteredAt);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(
    null,
  );
  const [showLocationPermissionModal, setShowLocationPermissionModal] = useState(false);
  // Incrementado por "Tentar novamente" para reexecutar o fluxo de
  // localização → captura facial do zero, sem duplicar essa lógica.
  const [retryToken, setRetryToken] = useState(0);

  // Trava de reentrada: garante um envio por vez mesmo se o clique escapar
  // enquanto o React ainda não re-renderizou o botão desabilitado.
  const submittingRef = useRef(false);
  const router = useRouter();
  const [attempt, setAttempt] = useState(1);
  // Cancela o envio em andamento (e o backoff) se o aluno sair da tela.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (alreadyRegisteredAt) return;

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
      (geoError) => {
        // PERMISSION_DENIED (código 1): quem nunca usou o app não entende
        // sozinho que precisa liberar a localização — o popup chama mais
        // atenção do que o texto discreto do card de erro.
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setShowLocationPermissionModal(true);
        }
        setStage("erro");
        setMessage("Não foi possível obter sua localização. Ative o GPS e permita o acesso.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [alreadyRegisteredAt, retryToken]);

  // Chamado pelo clique do botão, nunca do corpo do efeito — resetar estado ali
  // dispararia o lint react-hooks/set-state-in-effect.
  function handleRetry() {
    setMessage(null);
    setRejectionReason(null);
    setShowLocationPermissionModal(false);
    setStage("localizando");
    setRetryToken((t) => t + 1);
  }

  async function handleFaceCaptured(descriptor: number[]) {
    if (!coords || submittingRef.current) return;
    submittingRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    setAttempt(1);
    setStage("enviando");

    try {
      const supabase = createClient();
      const deviceHash = await getDeviceFingerprint();
      const body = {
        qrToken: token,
        descriptor,
        latitude: coords.lat,
        longitude: coords.lng,
        accuracyMeters: coords.accuracy,
        deviceHash,
      };

      for (let n = 1; n <= MAX_ATTEMPTS; n++) {
        const { data, error } = await supabase.functions.invoke("checkin", {
          body,
          timeout: ATTEMPT_TIMEOUT_MS,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        if (!error && data) {
          handleResult(data);
          return;
        }

        if (isUnauthorizedError(error)) {
          router.replace("/entrar");
          return;
        }

        if (!isTransientError(error)) {
          setStage("erro");
          setMessage("Erro inesperado ao registrar a presença. Tente novamente.");
          return;
        }

        if (n === MAX_ATTEMPTS) break;

        setAttempt(n + 1);
        setStage("tentando-novamente");
        if (!(await sleep(backoffDelayMs(n), controller.signal))) return;
      }

      setStage("erro");
      setMessage(OVERLOADED_MESSAGE);
    } catch {
      if (controller.signal.aborted) return;
      setStage("erro");
      setMessage("Erro inesperado ao registrar a presença. Tente novamente.");
    } finally {
      // O resultado definitivo (aprovado/já registrado) nunca é reenviado: a
      // tela sai do fluxo de captura. Nos demais casos libera nova tentativa.
      submittingRef.current = false;
    }
  }

  /** Resposta definitiva do servidor (HTTP 200): mostra o resultado na hora, sem retry. */
  function handleResult(data: {
    status: string;
    checkpoint?: string;
    recordedAt?: string;
    reason?: string;
  }) {
    if (data.status === "approved") {
      setCheckpointLabel(data.checkpoint ?? null);
      setRegisteredAt(new Date().toISOString());
      setStage("aprovado");
      return;
    }

    // O servidor encontrou uma presença que já existia (ou barrou a segunda
    // gravação simultânea): isso não é recusa, é o estado atual do check-in.
    if (data.status === "already_registered") {
      setCheckpointLabel(data.checkpoint ?? checkpointLabel);
      setRegisteredAt(data.recordedAt ?? null);
      setStage("ja-registrado");
      return;
    }

    if (data.reason === "nao_autenticado") {
      router.replace("/entrar");
      return;
    }

    setMessage(
      (data.reason && REJECTION_MESSAGES[data.reason]) ?? "Não foi possível registrar sua presença.",
    );
    setRejectionReason(data.reason ?? null);
    setStage("rejeitado");
  }

  const isConfirmed = stage === "aprovado" || stage === "ja-registrado";

  return (
    <PageBackground>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl border border-zinc-100 bg-white/90 p-8 text-center shadow-xl shadow-zinc-900/5 backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-zinc-50 shadow-sm ring-1 ring-zinc-100">
            <Image src="/logo-unisanta-marca.png" alt="Unisanta" width={44} height={44} />
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
              backLink={{ href: "/eventos", label: "Voltar para eventos" }}
            />
          )}

          {stage === "enviando" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-unisanta-navy" />
              <p className="text-sm text-zinc-500">Validando presença...</p>
            </div>
          )}

          {stage === "tentando-novamente" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-unisanta-navy" />
              <p className="text-sm text-zinc-500">
                Tentando novamente... (tentativa {attempt} de {MAX_ATTEMPTS})
              </p>
              <p className="text-xs text-zinc-400">Não feche nem recarregue a página.</p>
            </div>
          )}

          {isConfirmed && (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-medium text-zinc-800">
                  {stage === "aprovado"
                    ? "Presença registrada com sucesso!"
                    : "Sua presença neste momento já está registrada."}
                </p>
                {checkpointLabel && <p className="text-sm text-zinc-500">{checkpointLabel}</p>}
                {registeredAt && (
                  <p className="text-xs text-zinc-400">
                    Registrada em {formatDateTimeBR(new Date(registeredAt))}
                  </p>
                )}
              </div>

              {/* O botão fica visível e desabilitado, deixando explícito que
                  não há mais nada a fazer nesta tela. */}
              <Button type="button" disabled className="w-full">
                <CheckCircle2 className="h-4 w-4" />
                Presença confirmada
              </Button>

              <Link
                href="/minhas-presencas"
                className="text-sm font-medium text-unisanta-navy hover:underline"
              >
                Ver minhas presenças
              </Link>

              <Link
                href="/eventos"
                className="text-sm font-medium text-zinc-500 hover:underline"
              >
                Voltar para a tela inicial
              </Link>
            </>
          )}

          {stage === "rejeitado" && (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
              <p className="font-medium text-unisanta-red">Não foi possível registrar</p>
              <p className="text-sm text-zinc-500">{message}</p>
              <Button type="button" onClick={handleRetry} className="w-full">
                Tentar novamente
              </Button>

              {/* Insistir não adianta quando o rosto cadastrado foi capturado
                  em outra condição: a comparação vai falhar sempre. A saída é
                  recapturar aqui mesmo, no local, e é para isso que apontamos. */}
              {rejectionReason === "biometria_nao_confere" && (
                <div className="flex w-full flex-col gap-2 rounded-xl bg-amber-50/70 p-3 text-center">
                  <p className="text-xs leading-relaxed text-amber-800">
                    Já tentou mais de uma vez? Sua foto de cadastro pode ter sido feita
                    com outra iluminação. Atualize seu rosto aqui mesmo e tente de novo.
                  </p>
                  <Link
                    href={`/meus-dados/rosto?voltar=${encodeURIComponent(`/presenca/${token}`)}`}
                    className="flex items-center justify-center gap-1.5 text-sm font-medium text-unisanta-navy underline-offset-4 hover:underline"
                  >
                    <ScanFace className="h-4 w-4" />
                    Atualizar meu rosto
                  </Link>
                </div>
              )}

              <Link
                href="/eventos"
                className="text-sm font-medium text-zinc-500 hover:underline"
              >
                Voltar para eventos
              </Link>
            </>
          )}

          {stage === "erro" && (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <XCircle className="h-8 w-8 text-unisanta-red" />
              </div>
              <p className="text-sm text-unisanta-red">{message}</p>
              <Button type="button" onClick={handleRetry} className="w-full">
                Tentar novamente
              </Button>
              <Link
                href="/eventos"
                className="text-sm font-medium text-zinc-500 hover:underline"
              >
                Voltar para eventos
              </Link>
            </>
          )}
        </div>
      </div>

      {showLocationPermissionModal && (
        <PermissionModal
          title="Acesso à localização necessário"
          message="Você precisa permitir o acesso à localização para registrar presença. Habilite a permissão nas configurações do navegador e tente novamente."
          onDismiss={() => setShowLocationPermissionModal(false)}
        />
      )}
    </PageBackground>
  );
}
