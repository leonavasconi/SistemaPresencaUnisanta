"use client";

import { useEffect, useRef, useState } from "react";
import { loadFaceModels, extractFaceDescriptor } from "@/lib/face/models";

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

      <div className="relative aspect-square w-64 overflow-hidden rounded-2xl bg-zinc-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full scale-x-[-1] object-cover"
        />
        {status !== "ready" && status !== "processing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-center text-xs text-white">
            {status === "loading-models" && "Carregando modelo de reconhecimento facial..."}
            {status === "starting-camera" && "Solicitando acesso à câmera..."}
            {status === "error" && (errorMessage ?? "Erro ao acessar a câmera")}
          </div>
        )}
      </div>

      {errorMessage && status === "ready" && (
        <p className="text-center text-sm text-unisanta-red">{errorMessage}</p>
      )}

      <button
        type="button"
        onClick={handleCapture}
        disabled={status !== "ready"}
        className="h-11 w-full max-w-64 rounded-lg bg-unisanta-red font-medium text-white transition-colors hover:bg-unisanta-red-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "processing" ? "Analisando..." : "Capturar rosto"}
      </button>
    </div>
  );
}
