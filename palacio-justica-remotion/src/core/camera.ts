import { easeSoft, lerp } from './easing.ts';
import type { CamKey, Item, Shot } from './types.ts';
import { MAX_SCALE } from './config.ts';

export interface Cam { cx: number; cy: number; z: number; r: number; zRaw: number; clamped: boolean }

const zoomOf = (k: CamKey, W: number, H: number) => Math.min(W / k.vw, H / k.vh);

// progresso eased do plano (ou da curva compartilhada camTime, usada na orbita)
export const shotU = (shot: Shot, f: number) => {
  if (shot.camTime) {
    const [A, B] = shot.camTime;
    const g = (x: number) => easeSoft((x - A) / (B - A));
    const g0 = g(shot.start), g1 = g(shot.end);
    return (g(f) - g0) / (g1 - g0 || 1);
  }
  return easeSoft((f - shot.start) / (shot.end - shot.start));
};

// Hermite monotono (Fritsch-Carlson): passa pelos keyframes no tempo certo,
// sem ultrapassar e sem zerar a velocidade entre eles.
function monotone(ts: number[], vs: number[], t: number): number {
  const n = ts.length;
  if (t <= ts[0]) return vs[0];
  if (t >= ts[n - 1]) return vs[n - 1];
  const d: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / (ts[i + 1] - ts[i]));
  m.push(d[0] * 0.35);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2] * 0.35);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  let i = 0;
  while (t > ts[i + 1]) i++;
  const h = ts[i + 1] - ts[i], x = (t - ts[i]) / h;
  const h00 = 2 * x ** 3 - 3 * x ** 2 + 1, h10 = x ** 3 - 2 * x ** 2 + x, h01 = -2 * x ** 3 + 3 * x ** 2, h11 = x ** 3 - x ** 2;
  return h00 * vs[i] + h10 * h * m[i] + h01 * vs[i + 1] + h11 * h * m[i + 1];
}

export function cameraAt(shot: Shot, f: number, W: number, H: number, refScale = 1): Cam {
  const keys = shot.cam;
  let cx: number, cy: number, lz: number, r: number;
  if (keys.length > 2) {
    const ts = keys.map((k) => k.f), rel = f - shot.start;
    cx = monotone(ts, keys.map((k) => k.cx), rel);
    cy = monotone(ts, keys.map((k) => k.cy), rel);
    lz = monotone(ts, keys.map((k) => Math.log(zoomOf(k, W, H))), rel);
    r = monotone(ts, keys.map((k) => k.r ?? 0), rel);
  } else {
    const a = keys[0], b = keys[keys.length - 1];
    const u = shotU(shot, f);
    cx = lerp(a.cx, b.cx, u); cy = lerp(a.cy, b.cy, u);
    lz = lerp(Math.log(zoomOf(a, W, H)), Math.log(zoomOf(b, W, H)), u);
    r = lerp(a.r ?? 0, b.r ?? 0, u);
  }
  const zRaw = Math.exp(lz);
  // so contam para o limite os itens que estao na tela neste quadro
  const vis = shot.items.filter((it) => isVisible(it, cx, cy, zRaw, W, H));
  const maxS = Math.max(...(vis.length ? vis : shot.items).map((it) => it.s), 1e-9);
  // refScale: px da tela final por px da composicao
  const zMax = MAX_SCALE / (maxS * refScale);
  const z = Math.min(zRaw, zMax);
  return { cx, cy, z, r, zRaw, clamped: zRaw > zMax + 1e-9 };
}

// teste conservador (circulo envolvente da tela, cobre a rotacao)
export function isVisible(it: Item, cx: number, cy: number, z: number, W: number, H: number) {
  const iw = (it.w ?? 0) * it.s, ih = (it.h ?? 0) * it.s;
  const rad = Math.hypot(W, H) / 2 / z;
  const nx = Math.max(it.x, Math.min(cx, it.x + iw)), ny = Math.max(it.y, Math.min(cy, it.y + ih));
  return Math.hypot(nx - cx, ny - cy) <= rad;
}

export const effectiveScale = (cam: Cam, it: Item) => cam.z * it.s;
export const rawScale = (cam: Cam, it: Item) => cam.zRaw * it.s;
