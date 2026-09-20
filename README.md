# Sistema de Presença Unisanta

Sistema de registro automatizado de presença em eventos acadêmicos, validando
simultaneamente **quem** (biometria facial), **onde** (área geográfica do
evento) e **quando** (janela de horário definida pelo organizador), em
conformidade com a LGPD.

O cadastro é aberto a **qualquer participante** — ser aluno da Unisanta é
opcional, e só então RA e curso passam a ser exigidos.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Supabase](https://supabase.com) — Postgres, Auth e Edge Functions
- [face-api.js](https://github.com/justadudewhohacks/face-api.js) — reconhecimento facial no navegador
- Leaflet/OpenStreetMap — definição da área do evento
- Hospedagem: [Vercel](https://vercel.com)

## Rodando localmente

```bash
npm install
cp .env.local.example .env.local # preencha com as chaves do seu projeto Supabase
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

> Câmera e geolocalização só funcionam em contexto seguro. `localhost` conta
> como seguro; acessar pelo IP da rede (`192.168.x.x`) em HTTP **não** — para
> testar o check-in no celular, use um túnel HTTPS (`npx localtunnel --port 3000`).

O schema do banco está em `supabase/migrations/` e a Edge Function de
check-in em `supabase/functions/checkin/`. Ambos precisam ser aplicados no
projeto Supabase (`supabase db push` e `supabase functions deploy checkin`).

## Acessos

Os dois fluxos são separados por rota e validados no middleware, não só
visualmente:

| Quem | Entra por | Área |
|---|---|---|
| Participante | `/entrar` | `/eventos`, `/minhas-presencas`, `/meus-dados` |
| Administrador | `/admin/entrar` | `/admin/events` |

Uma conta de administrador não entra pela tela do participante (e vice-versa):
o middleware confere a existência de um registro em `perfis` nas duas direções.

Recuperação de senha em `/esqueci-senha`, usando o mecanismo do Supabase Auth
(nenhum token próprio); o link de e-mail chega em `/auth/confirmar`, que troca
o código por sessão e leva a `/redefinir-senha`.

## Área do evento

A validação de localização usa um **polígono de pelo menos 3 pontos** (sem
máximo) marcado pelo organizador no mapa, ou caminhando até cada ponto — o
check-in só é aceito para quem estiver dentro dessa área (point-in-polygon
por ray casting, sobre coordenadas projetadas em metros, com margem para o
erro do GPS).

A área é **opcional na criação do evento** — dá para cadastrar o evento
adiantado e marcar os pontos depois, presencialmente, pela tela do evento.
Enquanto a área não estiver definida, o evento fica visível para os
participantes mas com o check-in bloqueado ("Aguardando local definido").

Áreas podem ser salvas com um nome (ex: "Sala 420A") e reaproveitadas em
outros eventos, em vez de remarcar os mesmos pontos toda vez; o sistema
impede salvar a mesma área duas vezes com nomes diferentes, e impede dois
eventos no mesmo local com horário conflitante.

Eventos criados antes dessa mudança (ou cujos pontos foram marcados no mesmo
lugar, resultando em área zero) continuam sendo validados pelo círculo
centro + raio que já usavam.

## Funcionalidades

- **Participante**: cadastro aberto (dados acadêmicos só para alunos Unisanta),
  consentimento LGPD e biometria facial; check-in por QR Code (área do evento +
  selfie), com presença única por momento e opção de tentar novamente em caso
  de erro; histórico de presenças; recuperação de senha; exclusão dos dados
  pessoais.
- **Administrador**: criação de eventos com área opcional (definível depois) e
  locais reaproveitáveis; QR Code do próprio evento, disponível para download;
  momentos de presença customizáveis, cada um com QR Code próprio — momentos
  que já têm presença registrada têm horário e remoção travados; painel de
  acompanhamento e exportação em CSV/XLSX.
