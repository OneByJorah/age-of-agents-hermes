import type { ThemeDef } from '../theme/types';

export type TerrainId = 'grass' | 'dirt' | 'water' | 'rock';
export const TERRAINS: readonly TerrainId[] = ['grass', 'dirt', 'water', 'rock'];

/** Deterministyczny hash węzła kraty → [0,1). Bez Math.random. */
function hash01(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Gładki value-noise w punkcie (x,y) przy danej częstotliwości. */
function valueNoise(x: number, y: number, freq: number, seed: number): number {
  const fx = x * freq;
  const fy = y * freq;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = smooth(fx - x0);
  const ty = smooth(fy - y0);
  const top = lerp(hash01(x0, y0, seed), hash01(x0 + 1, y0, seed), tx);
  const bot = lerp(hash01(x0, y0 + 1, seed), hash01(x0 + 1, y0 + 1, seed), tx);
  return lerp(top, bot, ty);
}

/** Dwie oktawy → organiczne plamy z nieregularnym brzegiem. */
function fbm(x: number, y: number, seed: number): number {
  return valueNoise(x, y, 0.16, seed) * 0.65 + valueNoise(x, y, 0.34, seed + 9973) * 0.35;
}

/** Dystans punktu (px,py) do odcinka (a–b) w przestrzeni siatki. */
function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const WATER_BELOW = 0.25; // niskie zagłębienia szumu → stawy
const ROCK_ABOVE = 0.78; // wysokie grzbiety → połacie skał
const ROAD_WIDTH = 0.65; // pół-szerokość pasa ziemi wokół dróg

/**
 * Proceduralna, estetyczna mapa biomów (deterministyczna).
 * grass = baza; water = spójne stawy (value-noise); rock = połacie z buforem
 * trawy od wody (brak styków woda-skała → czysty autotiling Wang); dirt =
 * ścieżki wzdłuż dróg (theme.edges), tylko na trawie.
 */
export function buildTerrainMap(theme: ThemeDef): TerrainId[][] {
  const { w, h } = theme.grid;
  const map: TerrainId[][] = Array.from({ length: h }, () => Array.from({ length: w }, () => 'grass' as TerrainId));

  const isWater = (gx: number, gy: number) => fbm(gx, gy, 1) < WATER_BELOW;

  // 1. woda + skała (skała z buforem 1 komórki od wody)
  for (let gy = 0; gy < h; gy++) {
    for (let gx = 0; gx < w; gx++) {
      if (isWater(gx, gy)) { map[gy][gx] = 'water'; continue; }
      if (fbm(gx, gy, 7) > ROCK_ABOVE) {
        const nearWater =
          isWater(gx - 1, gy) || isWater(gx + 1, gy) || isWater(gx, gy - 1) || isWater(gx, gy + 1);
        if (!nearWater) map[gy][gx] = 'rock';
      }
    }
  }

  // 2. ścieżki ziemne wzdłuż dróg — tylko na trawie (nie zatapiają wody/skał)
  const nodeAt = (id: string): { gx: number; gy: number } | undefined =>
    id.startsWith('door:')
      ? theme.buildings.find((b) => `door:${b.id}` === id)?.door
      : theme.crossroads.find((c) => c.id === id);
  const segs = theme.edges
    .map(([a, b]) => [nodeAt(a), nodeAt(b)] as const)
    .filter((s): s is [{ gx: number; gy: number }, { gx: number; gy: number }] => !!s[0] && !!s[1]);

  for (let gy = 0; gy < h; gy++) {
    for (let gx = 0; gx < w; gx++) {
      if (map[gy][gx] !== 'grass') continue;
      for (const [a, b] of segs) {
        if (distToSeg(gx + 0.5, gy + 0.5, a.gx, a.gy, b.gx, b.gy) < ROAD_WIDTH) {
          map[gy][gx] = 'dirt';
          break;
        }
      }
    }
  }

  return map;
}
