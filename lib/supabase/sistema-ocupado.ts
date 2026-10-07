/**
 * Página servida quando o Auth ou o banco não respondem a tempo (status 503).
 *
 * É HTML puro, sem React nem arquivos externos, de propósito: precisa abrir
 * mesmo com o resto do sistema engasgado, e não pode depender de nada que
 * também esteja lento. O botão só recarrega a página — não redireciona para
 * lugar nenhum, então não há como entrar em loop.
 */
export function paginaSistemaOcupado(): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Sistema ocupado</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fafafa;color:#27272a;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  main{box-sizing:border-box;width:100%;max-width:24rem;margin:1.5rem;padding:2rem;background:#fff;border:1px solid #f4f4f5;border-radius:1.5rem;text-align:center;box-shadow:0 10px 30px rgba(24,24,27,.06)}
  h1{margin:0 0 .5rem;font-size:1.25rem;color:#29166f}
  p{margin:0 0 1.5rem;font-size:.95rem;line-height:1.5;color:#52525b}
  button{width:100%;height:3rem;border:0;border-radius:.75rem;background:#da251c;color:#fff;font-size:.95rem;font-weight:600;cursor:pointer}
  button:hover{background:#b31d16}
</style>
</head>
<body>
<main role="alert">
  <h1>Sistema ocupado</h1>
  <p>Muita gente está usando o sistema agora. Aguarde alguns instantes e tente de novo. Sua sessão continua ativa.</p>
  <button type="button" onclick="location.reload()">Tentar novamente</button>
</main>
</body>
</html>`;
}
