import * as faceapi from "face-api.js";

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
