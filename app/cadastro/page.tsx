"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaceCapture } from "@/components/FaceCapture";
import { CONSENT_TEXT } from "@/lib/consent";
import { saveEnrollment } from "./actions";

type Step = "dados" | "consentimento" | "biometria" | "concluido";

export default function CadastroPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("dados");
  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("Unisanta");
  const [matricula, setMatricula] = useState("");
  const [course, setCourse] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFaceCaptured(descriptor: number[]) {
    setSaving(true);
    setError(null);
    const result = await saveEnrollment({
      fullName,
      institution,
      matricula,
      course,
      descriptor,
    });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setStep("concluido");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-100">
        <Image src="/logo-unisanta.png" alt="Unisanta" width={64} height={64} />
        <h1 className="text-xl font-semibold tracking-tight text-unisanta-navy">
          Cadastro de presença
        </h1>

        {step === "dados" && (
          <form
            className="flex w-full flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setStep("consentimento");
            }}
          >
            <input
              required
              placeholder="Nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
            <input
              required
              placeholder="Instituição"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className={inputClass}
            />
            <input
              required
              placeholder="Matrícula"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              className={inputClass}
            />
            <input
              required
              placeholder="Curso"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className={inputClass}
            />
            <button type="submit" className={primaryButtonClass}>
              Continuar
            </button>
          </form>
        )}

        {step === "consentimento" && (
          <div className="flex w-full flex-col gap-4">
            <div className="max-h-56 overflow-y-auto whitespace-pre-line rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
              {CONSENT_TEXT}
            </div>
            <label className="flex items-start gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-1"
              />
              Li e concordo com o uso dos meus dados conforme descrito acima.
            </label>
            <button
              type="button"
              disabled={!consentChecked}
              onClick={() => setStep("biometria")}
              className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Continuar
            </button>
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
            <p className="text-sm text-zinc-600">
              Cadastro concluído! Agora você já pode registrar presença nos eventos
              lendo o QR Code exibido no local.
            </p>
            <button
              type="button"
              onClick={() => router.push("/minhas-presencas")}
              className={primaryButtonClass}
            >
              Ver minhas presenças
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-unisanta-navy focus:ring-1 focus:ring-unisanta-navy";

const primaryButtonClass =
  "h-11 w-full rounded-lg bg-unisanta-red font-medium text-white transition-colors hover:bg-unisanta-red-dark";
