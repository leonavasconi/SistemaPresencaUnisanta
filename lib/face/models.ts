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

/**
 * Detecta um único rosto na imagem/vídeo e retorna o descritor facial
 * (128 números) usado tanto no cadastro quanto no check-in.
 */
export async function extractFaceDescriptor(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
): Promise<Float32Array | null> {
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection?.descriptor ?? null;
}
