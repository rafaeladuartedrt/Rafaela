import React from 'react';
import {Easing, spring} from 'remotion';
import {svgPathProperties} from 'svg-path-properties';

// Paleta absoluta: somente estas duas cores existem no vídeo.
export const BG = '#280A96';
export const FG = '#D7EDE3';
export const SW = 7; // espessura constante do traço

export type Pt = [number, number];
export type Ease = (t: number) => number;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// Deslocamentos: cubic-bezier(0.65, 0, 0.35, 1)
export const io: Ease = Easing.bezier(0.65, 0, 0.35, 1);
export const outQ: Ease = Easing.bezier(0.22, 1, 0.36, 1);
export const inQ: Ease = Easing.bezier(0.55, 0, 1, 0.45);
export const lin: Ease = (t) => t;
export const outBack: Ease = (t) => {
  const s = 1.9;
  return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
};
export const prog = (f: number, a: number, b: number, e: Ease = io) => e(clamp((f - a) / (b - a)));

// Mola com damping baixo para chegadas (overshoot e acomodação)
export const sp = (f: number, start: number, damping = 10, stiffness = 140, mass = 0.9) =>
  f < start ? 0 : spring({frame: f - start, fps: 30, config: {damping, stiffness, mass}});

// Hash determinístico
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const hs = (n: number) => hash(n) * 2 - 1; // -1..1

// Ruído suave 1D (value noise)
export const noise = (t: number, seed = 0) => {
  const i = Math.floor(t);
  const fr = t - i;
  const u = fr * fr * (3 - 2 * fr);
  return lerp(hs(i + seed * 57.3), hs(i + 1 + seed * 57.3), u);
};

// Respiração do personagem: período de 45 frames (900/45 = 20 ciclos, loop exato)
export const breath = (f: number, amp = 0.015) => 1 + amp * Math.sin((2 * Math.PI * f) / 45);

// Keyframes com easing por segmento
export type Key = {f: number; v: number[]; e?: Ease};
export const track = (f: number, keys: Key[]): number[] => {
  if (f <= keys[0].f) return keys[0].v;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (f <= b.f) {
      const t = b.f === a.f ? 1 : (f - a.f) / (b.f - a.f);
      const e = (b.e ?? io)(t);
      return a.v.map((x, j) => x + (b.v[j] - x) * e);
    }
  }
  return keys[keys.length - 1].v;
};

// Batida da trilha: 120 BPM = 1 batida a cada 15 frames
export const beatPulse = (f: number, decay = 5) => {
  const b = Math.floor(f / 15) * 15;
  return Math.exp(-(f - b) / decay);
};

// ----- Geometria para metamorfose por interpolação de pontos -----
export const polyLen = (P: Pt[]) => {
  let L = 0;
  for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  return L;
};
export const resample = (P: Pt[], n: number): Pt[] => {
  const segs: number[] = [0];
  for (let i = 1; i < P.length; i++) segs.push(segs[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = segs[segs.length - 1];
  const out: Pt[] = [];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const d = (L * k) / (n - 1);
    while (j < P.length - 1 && segs[j] < d) j++;
    const t = segs[j] === segs[j - 1] ? 0 : (d - segs[j - 1]) / (segs[j] - segs[j - 1]);
    out.push([lerp(P[j - 1][0], P[j][0], t), lerp(P[j - 1][1], P[j][1], t)]);
  }
  return out;
};
const propsCache = new Map<string, any>();
export const samplePath = (d: string, n: number, dx = 0, dy = 0, closed = true): Pt[] => {
  let p = propsCache.get(d);
  if (!p) {
    p = new svgPathProperties(d);
    propsCache.set(d, p);
  }
  const L = p.getTotalLength();
  const out: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const pt = p.getPointAtLength((L * k) / (closed ? n : n - 1));
    out.push([pt.x + dx, pt.y + dy]);
  }
  return out;
};
export const pathLen = (d: string) => {
  let p = propsCache.get(d);
  if (!p) {
    p = new svgPathProperties(d);
    propsCache.set(d, p);
  }
  return p.getTotalLength();
};
export const lerpPts = (A: Pt[], B: Pt[], t: number): Pt[] => A.map((p, i) => [lerp(p[0], B[i][0], t), lerp(p[1], B[i][1], t)]);
export const toD = (P: Pt[], closed = false) =>
  P.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('') + (closed ? 'Z' : '');
export const followPolyline = (P: Pt[], u: number): Pt => {
  const R = resample(P, 400);
  const k = clamp(u) * (R.length - 1);
  const i = Math.floor(k);
  const t = k - i;
  const a = R[i];
  const b = R[Math.min(i + 1, R.length - 1)];
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
};

// ----- Hachura de duas cores -----
// Linhas em FG sobre o fundo. weight >= spacing equivale a preenchimento sólido.
// Usada para "acender" (linhas engrossam até o sólido) e "apagar" (linhas afinam e se espaçam).
export const Hatch: React.FC<{id: string; weight: number; spacing?: number; angle?: number}> = ({id, weight, spacing = 14, angle = 45}) => (
  <pattern id={id} patternUnits="userSpaceOnUse" width={spacing} height={spacing} patternTransform={`rotate(${angle})`}>
    <rect x={0} y={0} width={clamp(weight, 0, spacing)} height={spacing} fill={FG} />
  </pattern>
);
export const hatchFill = (id: string, weight: number, spacing = 14) => (weight >= spacing - 0.01 ? FG : weight <= 0.05 ? 'none' : `url(#${id})`);

// Traço padrão (arredondado, espessura constante mesmo com escala)
export const stroke = (w = SW) => ({
  stroke: FG,
  strokeWidth: w,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  vectorEffect: 'non-scaling-stroke' as const,
});

// Desenho do traço: fração 0..1 visível
export const drawDash = (len: number, p: number) => ({
  strokeDasharray: `${len + 2} ${len + 2}`,
  strokeDashoffset: (len + 2) * (1 - clamp(p)),
});

// Fragmentação: 0 = traço contínuo, 0.6 = pontos (retícula), 1 = some
export const fragDash = (q: number, period = 46, crawl = 0) => {
  const a = clamp(q / 0.6);
  const dash = Math.max(0.01, period * (1 - a));
  return {strokeDasharray: q <= 0.001 ? 'none' : `${dash} ${period - dash + 0.01}`, strokeDashoffset: crawl};
};
export const fragWidth = (q: number, w = SW) => (q <= 0.6 ? w : w * (1 - clamp((q - 0.6) / 0.4)));
