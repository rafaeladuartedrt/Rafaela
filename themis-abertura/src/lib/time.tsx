import React, { createContext, useContext } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { DURATION_SECONDS } from '../config';

/** Tempo em segundos (fracionário, para amostragem de sub-frames do motion blur). */
const TimeCtx = createContext<number | null>(null);

export const TimeProvider: React.FC<{ t: number; children: React.ReactNode }> = ({ t, children }) => (
  <TimeCtx.Provider value={t}>{children}</TimeCtx.Provider>
);

export const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctx = useContext(TimeCtx);
  return ctx ?? frame / fps;
};

export const T = DURATION_SECONDS;
export const TAU = Math.PI * 2;
/** Fase periódica fechada no loop: n ciclos inteiros em 30 s. */
export const phase = (t: number, n = 1, offset = 0) => TAU * n * (t / T) + offset;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, p: number) => (p <= 0 ? a : p >= 1 ? b : a + (b - a) * p);

/** cubic-bezier igual ao CSS (resolve x->t por Newton + bisseção). */
export const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= (sx(t) - x) / d;
    }
    let lo = 0, hi = 1;
    if (t < 0 || t > 1 || Math.abs(sx(t) - x) > 1e-5) {
      t = x;
      for (let i = 0; i < 30; i++) {
        if (sx(t) < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
    }
    return sy(t);
  };
};

/** Curvas do projeto. Nada linear. */
export const E = {
  /** entrada/saída principal do briefing */
  main: bezier(0.7, 0, 0.2, 1),
  /** dolly de câmera: arranque e frenagem perceptíveis, mais suave */
  dolly: bezier(0.45, 0, 0.25, 1),
  out: bezier(0.16, 1, 0.3, 1),
  in: bezier(0.6, 0, 0.9, 0.4),
  soft: bezier(0.4, 0, 0.3, 1),
};

/** progresso [0..1] entre a e b com easing */
export const seg = (t: number, a: number, b: number, ease: (x: number) => number = E.main) =>
  ease(clamp01((t - a) / (b - a)));

/** mola criticamente amortecida/sobreamortecida (assentamento sem quique visível) */
export const spring = (t: number, a: number, dur: number, zeta = 0.82) => {
  if (t <= a) return 0;
  const x = (t - a) / dur;
  if (x >= 1.6) return 1;
  const w = 7.5;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  const v = 1 - Math.exp(-zeta * w * x) * (Math.cos(wd * x) + ((zeta * w) / wd) * Math.sin(wd * x));
  return v;
};

/** envelope: sobe em [a,b], fica em 1, desce em [c,d] */
export const env = (t: number, a: number, b: number, c: number, d: number, ease = E.main) =>
  Math.min(seg(t, a, b, ease), 1 - seg(t, c, d, ease));

/** pseudo-aleatório determinístico */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
