"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { loadFaceModels, extractFaceDescriptor } from "@/lib/face/models";
import { Button } from "@/components/ui/Button";

type Status = "loading-models" | "starting-camera" | "ready" | "processing" | "error";

export function FaceCapture({
  instructions,
  onCaptured,
}: {
  instructions: string;
  onCaptured: (descriptor: number[]) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("loading-models");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        await loadFaceModels();
        if (cancelled) return;

        setStatus("starting-camera");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus("ready");
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Não foi possível acessar a câmera",
        );
        setStatus("error");
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function handleCapture() {
    if (!videoRef.current) return;
    setStatus("processing");
    setErrorMessage(null);

    const descriptor = await extractFaceDescriptor(videoRef.current);
    if (!descriptor) {
      setErrorMessage("Nenhum rosto detectado. Posicione seu rosto no centro da câmera.");
      setStatus("ready");
      return;
    }

    onCaptured(Array.from(descriptor));
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-center text-sm text-zinc-500">{instructions}</p>

      <div className="relative aspect-square w-64 overflow-hidden rounded-3xl bg-zinc-900 shadow-inner">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full scale-x-[-1] object-cover"
        />
        {status === "ready" && (
          <div className="pointer-events-none absolute inset-6 rounded-full border-2 border-dashed border-white/40" />
        )}
        {status !== "ready" && status !== "processing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 px-4 text-center text-xs text-white">
            {(status === "loading-models" || status === "starting-camera") && (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            {status === "loading-models" && "Carregando modelo de reconhecimento facial..."}
            {status === "starting-camera" && "Solicitando acesso à câmera..."}
            {status === "error" && (errorMessage ?? "Erro ao acessar a câmera")}
          </div>
        )}
        {status === "processing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>

      {errorMessage && status === "ready" && (
        <p className="text-center text-sm text-unisanta-red">{errorMessage}</p>
      )}

      <Button
        type="button"
        onClick={handleCapture}
        disabled={status !== "ready"}
        className="w-full max-w-64"
      >
        <Camera className="h-4 w-4" />
        {status === "processing" ? "Analisando..." : "Capturar rosto"}
      </Button>
    </div>
  );
}
