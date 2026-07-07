import { Check } from "lucide-react";

export function Stepper({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  return (
    <div className="flex w-full items-center">
      {steps.map((step, i) => (
        <div key={step} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                i < currentIndex
                  ? "bg-unisanta-navy text-white"
                  : i === currentIndex
                    ? "bg-unisanta-red text-white"
                    : "bg-zinc-100 text-zinc-400"
              }`}
            >
              {i < currentIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={`hidden text-[11px] sm:block ${
                i === currentIndex ? "font-medium text-zinc-700" : "text-zinc-400"
              }`}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mx-2 h-0.5 flex-1 rounded-full transition-colors ${
                i < currentIndex ? "bg-unisanta-navy" : "bg-zinc-100"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
