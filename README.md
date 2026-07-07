# Sistema de Presença Unisanta

Sistema de registro automatizado de presença em eventos acadêmicos, validando
simultaneamente **quem** (biometria facial), **onde** (geolocalização) e
**quando** (janela de horário definida pelo organizador), em conformidade com
a LGPD.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Supabase](https://supabase.com) — Postgres, Auth e Edge Functions
- [face-api.js](https://github.com/justadudewhohacks/face-api.js) — reconhecimento facial no navegador
- Leaflet/OpenStreetMap — seleção do local do evento
- Hospedagem: [Vercel](https://vercel.com)

## Rodando localmente

```bash
npm install
cp .env.local.example .env.local # preencha com as chaves do seu projeto Supabase
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

O schema do banco está em `supabase/migrations/` e a Edge Function de
check-in em `supabase/functions/checkin/`. Ambos precisam ser aplicados no
projeto Supabase (`supabase db push` e `supabase functions deploy checkin`).

## Funcionalidades

- **Aluno**: cadastro com dados pessoais, consentimento LGPD e biometria facial; check-in por QR Code (geolocalização + selfie); histórico de presenças; exclusão de dados pessoais.
- **Administrador**: criação de eventos com localização geográfica; momentos de presença customizáveis (início, meio, fim, ou qualquer combinação), cada um com QR Code próprio; painel de acompanhamento em tempo real e exportação em CSV.
