/**
 * Cede ao navegador até ele PINTAR o que acabou de mudar na tela.
 *
 * Um `setState` do React só marca a mudança; quem desenha é o navegador, no
 * próximo quadro. Se logo em seguida o código entra em trabalho síncrono pesado
 * (como a detecção facial do TF.js, que roda na thread principal), o quadro
 * nunca chega a ser desenhado e o aluno vê a tela congelada até o fim — sem o
 * "Analisando...". Esperar o `requestAnimationFrame` garante que a mudança foi
 * enviada ao quadro; o `setTimeout(0)` depois dele só devolve o controle depois
 * que esse quadro foi de fato pintado.
 *
 * `requestAnimationFrame` não dispara em aba oculta; o temporizador de reserva
 * impede que a captura fique esperando para sempre nesse caso.
 */
export function aguardarPintura(): Promise<void> {
  return new Promise((resolve) => {
    let resolvido = false;
    const terminar = () => {
      if (resolvido) return;
      resolvido = true;
      resolve();
    };

    requestAnimationFrame(() => setTimeout(terminar, 0));
    setTimeout(terminar, 200);
  });
}
