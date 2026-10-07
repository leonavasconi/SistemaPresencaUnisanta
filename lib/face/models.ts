import * as faceapi from "face-api.js";
import { aguardarPintura } from "@/lib/ui/aguardarPintura";

const MODEL_URL = "/models";
let modelsLoadedPromise: Promise<void> | null = null;

export function loadFaceModels(): Promise<void> {
  if (!modelsLoadedPromise) {
    modelsLoadedPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined);
  }
  return modelsLoadedPromise;
}

let aquecimento: Promise<void> | null = null;

/**
 * Aquece o TF.js: roda uma passada em cada rede sobre um canvas pequeno em
 * branco para compilar os shaders do WebGL, que é o que torna a PRIMEIRA
 * detecção muito mais lenta que as seguintes (os programas ficam em cache).
 *
 * Uma detecção comum num canvas em branco não acharia rosto e nunca chegaria às
 * redes de pontos e de descritor, então cada rede é chamada diretamente. O
 * tamanho do canvas não importa: cada rede redimensiona a entrada para o
 * tamanho que usa de verdade.
 *
 * Roda uma vez por página, sem ser esperada por quem chama: ignora o resultado
 * e os erros (aquecer é opcional e nunca pode virar erro na tela) e cede ao
 * navegador entre as redes, para não segurar a thread principal de uma vez só.
 */
export function aquecerModelos(): void {
  if (aquecimento) return;

  aquecimento = (async () => {
    try {
      await loadFaceModels();

      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 160;
      const contexto = canvas.getContext("2d");
      if (contexto) {
        contexto.fillStyle = "#808080";
        contexto.fillRect(0, 0, canvas.width, canvas.height);
      }

      await faceapi.nets.tinyFaceDetector.locateFaces(
        canvas,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }),
      );
      await aguardarPintura();
      await faceapi.nets.faceLandmark68Net.detectLandmarks(canvas);
      await aguardarPintura();
      await faceapi.nets.faceRecognitionNet.computeFaceDescriptor(canvas);
    } catch {
      // Aquecer é só otimização: se falhar, a primeira captura apenas demora mais.
    }
  })();
}

function isFaceWellFramed(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  box: { x: number; y: number; width: number; height: number },
): boolean {
  const width = input instanceof HTMLVideoElement ? input.videoWidth || input.width : input.width;
  const height = input instanceof HTMLVideoElement ? input.videoHeight || input.height : input.height;

  if (!width || !height) return false;

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const areaRatio = (box.width * box.height) / (width * height);

  const centered =
    centerX / width > 0.25 &&
    centerX / width < 0.75 &&
    centerY / height > 0.25 &&
    centerY / height < 0.75;

  const sizedCorrectly = areaRatio > 0.08 && areaRatio < 0.55;

  return centered && sizedCorrectly;
}

/**
 * Detecta um único rosto na imagem/vídeo e retorna o descritor facial
 * (128 números) usado tanto no cadastro quanto no check-in.
 *
 * Também exige que o rosto esteja enquadrado e centralizado na imagem para
 * reduzir captura de partes do rosto, objetos ou imagens fora do foco.
 */
export async function extractFaceDescriptor(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
): Promise<Float32Array | null> {
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  const box = detection.detection.box;
  if (!isFaceWellFramed(input, box)) {
    return null;
  }

  return detection.descriptor;
}
