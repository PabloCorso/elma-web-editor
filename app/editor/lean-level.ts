import type { LevelData } from "./level-importer";

export type LeanPosition = { x: number; y: number };
export type LeanPolygon = { vertices: LeanPosition[] };

export type LeanLevel = {
  name?: string;
  polygons: LeanPolygon[];
  apples: LeanPosition[];
  killers: LeanPosition[];
  flowers: LeanPosition[];
  start: LeanPosition;
};

function roundTo(n: number, decimals = 2) {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function leanPos(p: { x: number; y: number }, decimals = 2): LeanPosition {
  return { x: roundTo(p.x, decimals), y: roundTo(p.y, decimals) };
}

export function toLeanLevel(data: LevelData, decimals = 2): LeanLevel {
  return {
    name: data.name,
    polygons: data.polygons.map((poly) => ({
      vertices: poly.vertices.map((v) => leanPos(v, decimals)),
    })),
    start: leanPos(data.start, decimals),
    apples: data.apples.map((a) => leanPos(a.position, decimals)),
    killers: data.killers.map((k) => leanPos(k, decimals)),
    flowers: data.flowers.map((f) => leanPos(f, decimals)),
  };
}

export function toLeanLevelString(
  data: Parameters<typeof toLeanLevel>[0],
  decimals = 2
): string {
  const lean = toLeanLevel(data, decimals);
  return JSON.stringify(lean);
}
