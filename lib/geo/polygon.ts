// Validação de área por polígono (triângulo, no caso de 3 pontos).
//
// Substitui a checagem antiga de "distância até um ponto central <= raio",
// que aprovava qualquer lugar dentro de um círculo — inclusive a calçada, o
// prédio vizinho ou o andar de baixo, quando o raio precisava ser grande o
// bastante para cobrir uma sala comprida.

export type GeoPoint = { lat: number; lng: number };

const EARTH_RADIUS_M = 6371000;
const toRad = (v: number) => (v * Math.PI) / 180;

/**
 * Projeta lat/lng em metros num plano cartesiano local (equirretangular),
 * usando o primeiro vértice como origem. Em áreas pequenas — uma sala, um
 * bloco, um campus — o erro dessa projeção é desprezível, e ela permite
 * trabalhar com geometria plana comum.
 *
 * O `cos(lat)` é o que impede o erro clássico de comparar graus de latitude
 * com graus de longitude como se valessem a mesma distância: perto de Santos
 * (-23.96°), 1° de longitude vale ~102 km, contra ~111 km de 1° de latitude.
 */
function projectToMeters(point: GeoPoint, origin: GeoPoint): { x: number; y: number } {
  return {
    x: EARTH_RADIUS_M * toRad(point.lng - origin.lng) * Math.cos(toRad(origin.lat)),
    y: EARTH_RADIUS_M * toRad(point.lat - origin.lat),
  };
}

/** Menor distância (em metros) de um ponto até um segmento de reta. */
function distanceToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;

  // Segmento degenerado (dois vértices no mesmo lugar): vira distância ao ponto.
  if (lengthSquared === 0) return Math.hypot(p.x - a.x, p.y - a.y);

  // Projeção escalar de `p` sobre o segmento, presa ao intervalo [0, 1] para
  // que o resultado caia dentro do segmento e não na reta infinita.
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Ray casting: dispara um raio horizontal a partir do ponto e conta quantas
 * arestas ele cruza. Número ímpar de cruzamentos = dentro. Funciona para
 * qualquer polígono simples, então serve tanto para o triângulo de 3 pontos
 * quanto para as áreas de 4+ pontos já cadastradas antes desta mudança.
 */
function isInsideProjectedPolygon(
  p: { x: number; y: number },
  vertices: { x: number; y: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const { x: xi, y: yi } = vertices[i];
    const { x: xj, y: yj } = vertices[j];
    const crossesRay =
      yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (crossesRay) inside = !inside;
  }
  return inside;
}

export type AreaCheck = {
  /** Se o ponto pode registrar presença (dentro da área, ou dentro da margem). */
  inside: boolean;
  /** Distância até a borda, em metros. `0` quando o ponto está dentro do polígono. */
  distanceToEdgeMeters: number;
};

/**
 * Decide se uma coordenada está dentro da área do evento.
 *
 * `toleranceMeters` existe porque o GPS de celular erra — bastante, dentro de
 * prédios. Sem margem, um participante parado encostado na parede da sala
 * seria rejeitado por um desvio de leitura de poucos metros. A margem é
 * aplicada para fora da borda: quem está claramente longe continua sendo
 * barrado, e a área continua sendo definida pelos pontos marcados, não por
 * um raio arbitrário.
 */
export function checkPointInArea(
  point: GeoPoint,
  polygon: GeoPoint[],
  toleranceMeters = 0,
): AreaCheck {
  if (polygon.length < 3) {
    return { inside: false, distanceToEdgeMeters: Infinity };
  }

  const origin = polygon[0];
  const projected = projectToMeters(point, origin);
  const vertices = polygon.map((vertex) => projectToMeters(vertex, origin));

  if (isInsideProjectedPolygon(projected, vertices)) {
    return { inside: true, distanceToEdgeMeters: 0 };
  }

  let shortest = Infinity;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    shortest = Math.min(shortest, distanceToSegment(projected, vertices[j], vertices[i]));
  }

  return { inside: shortest <= toleranceMeters, distanceToEdgeMeters: shortest };
}

/** Quantos pontos definem a área de um evento novo: 3 = um triângulo. */
export const GEOFENCE_POINTS = 3;

/** Área mínima aceita (m²) — abaixo disso a área é fina demais para ser usável. */
export const MIN_GEOFENCE_AREA_M2 = 25;

/**
 * Área do polígono em m² (fórmula do shoelace, sobre o plano projetado).
 * Serve tanto para o triângulo de 3 pontos quanto para as áreas de 4+ pontos
 * cadastradas antes desta mudança.
 */
export function polygonAreaSquareMeters(points: GeoPoint[]): number {
  if (points.length < 3) return 0;
  const vertices = points.map((p) => projectToMeters(p, points[0]));
  let sum = 0;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    sum += vertices[j].x * vertices[i].y - vertices[i].x * vertices[j].y;
  }
  return Math.abs(sum) / 2;
}

/**
 * Se dá para decidir dentro/fora por esta área.
 *
 * Existem eventos gravados com 3 pontos idênticos (o organizador clicou em
 * "adicionar ponto com minha localização" três vezes parado no mesmo lugar),
 * cuja área é zero. Validar por um polígono desses reprovaria todo mundo, e
 * é por isso que o check-in trata esse caso como "sem área definida" e recai
 * no círculo centro+raio, que era como esses eventos já funcionavam.
 */
export function isUsableGeofence(points: GeoPoint[]): boolean {
  return points.length >= 3 && polygonAreaSquareMeters(points) >= MIN_GEOFENCE_AREA_M2;
}

/**
 * Valida a área desenhada pelo admin. Além da contagem de pontos, rejeita o
 * triângulo degenerado: três pontos alinhados (ou praticamente no mesmo
 * lugar) formam uma área de espessura zero, dentro da qual nenhum
 * participante conseguiria registrar presença.
 */
export function validateGeofenceTriangle(points: GeoPoint[]): string | null {
  if (points.length !== GEOFENCE_POINTS) {
    return `Marque exatamente ${GEOFENCE_POINTS} pontos para formar a área triangular do evento.`;
  }
  if (points.some((p) => !Number.isFinite(p.lat) || !Number.isFinite(p.lng))) {
    return "Há um ponto com coordenada inválida. Confira a latitude e a longitude.";
  }
  if (points.some((p) => Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180)) {
    return "Há um ponto fora do intervalo válido de latitude/longitude.";
  }
  if (polygonAreaSquareMeters(points) < MIN_GEOFENCE_AREA_M2) {
    return "Os 3 pontos estão alinhados ou muito próximos e não formam uma área utilizável. Afaste-os para cobrir o local do evento.";
  }
  return null;
}

/** Aceita apenas o que realmente parece uma coordenada — o array vem de JSONB. */
export function parseGeofencePoints(raw: unknown): GeoPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is GeoPoint =>
      !!p &&
      typeof p === "object" &&
      Number.isFinite((p as GeoPoint).lat) &&
      Number.isFinite((p as GeoPoint).lng),
  );
}
