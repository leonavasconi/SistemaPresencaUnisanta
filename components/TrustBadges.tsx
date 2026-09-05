import { ShieldCheck, MapPin, ScanFace } from "lucide-react";

/**
 * Os três diferenciais do sistema, em chips discretos. Vieram da tela inicial
 * antiga e hoje vivem no painel de marca das telas de autenticação — é a
 * única menção ao LGPD que a pessoa vê antes de criar conta.
 */
const FEATURES = [
  { icon: MapPin, label: "Validação por localização" },
  { icon: ScanFace, label: "Reconhecimento facial" },
  { icon: ShieldCheck, label: "Proteção de dados — LGPD" },
];

export function TrustBadges() {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-2 lg:gap-2.5">
      {FEATURES.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="flex items-center gap-2 rounded-xl border border-zinc-200/70 bg-white/80 py-2 pl-2.5 pr-3.5 text-xs font-medium text-zinc-600 shadow-sm shadow-zinc-900/[0.03] backdrop-blur-sm"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-unisanta-navy/8 text-unisanta-navy">
            <Icon className="h-3.5 w-3.5" />
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}
