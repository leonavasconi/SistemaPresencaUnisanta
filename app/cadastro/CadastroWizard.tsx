"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { FaceCapture } from "@/components/FaceCapture";
import { PageBackground } from "@/components/ui/PageBackground";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { CONSENT_TEXT } from "@/lib/consent";
import { saveEnrollment } from "./actions";

type Step = "consentimento" | "biometria" | "concluido";

const STEPS: { key: Step; label: string }[] = [
  { key: "consentimento", label: "Consentimento" },
  { key: "biometria", label: "Rosto" },
];

export function CadastroWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("consentimento");
  const [consentChecked, setConsentChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  async function handleFaceCaptured(descriptor: number[]) {
    setSaving(true);
    setError(null);
    const result = await saveEnrollment({ descriptor });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setStep("concluido");
  }

  return (
    <PageBackground>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl border border-zinc-100 bg-white/90 p-8 shadow-xl shadow-zinc-900/5 backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-zinc-50 shadow-sm ring-1 ring-zinc-100">
            <Image src="/logo-unisanta.png" alt="Unisanta" width={44} height={44} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-unisanta-navy">
            Cadastro de presença
          </h1>

          {step !== "concluido" && <Stepper steps={STEPS.map((s) => s.label)} currentIndex={stepIndex} />}

          {step === "consentimento" && (
            <div className="flex w-full flex-col gap-4">
              <div className="max-h-56 overflow-y-auto whitespace-pre-line rounded-xl bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600">
                {CONSENT_TEXT}
              </div>
              <label className="flex items-start gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 accent-unisanta-red"
                />
                Li e concordo com o uso dos meus dados conforme descrito acima.
              </label>
              <Button
                type="button"
                disabled={!consentChecked}
                onClick={() => setStep("biometria")}
                className="w-full"
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === "biometria" && (
            <div className="flex w-full flex-col gap-3">
              <FaceCapture
                instructions="Posicione seu rosto no centro para concluir o cadastro"
                onCaptured={handleFaceCaptured}
              />
              {saving && <p className="text-center text-sm text-zinc-500">Salvando...</p>}
              {error && (
                <p className="text-center text-sm text-unisanta-red">{error}</p>
              )}
            </div>
          )}

          {step === "concluido" && (
            <div className="flex w-full flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-sm text-zinc-600">
                Cadastro concluído! Agora você já pode registrar presença nos eventos
                lendo o QR Code exibido no local.
              </p>
              <Button type="button" onClick={() => router.push("/eventos")} className="w-full">
                Ver eventos
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageBackground>
  );
}
