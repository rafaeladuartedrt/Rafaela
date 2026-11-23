import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { C } from '../theme';
import { phase, rand, T, useT } from '../lib/time';
import { useU } from '../lib/units';

/**
 * Poeira em suspensão. Subida com wrap: deslocamento total em 30 s = k * altura
 * (k inteiro), oscilação lateral com n ciclos inteiros => posição em t=30 == t=0.
 */
type P = { x: number; y: number; r: number; a: number; k: number; n: number; ph: number; amp: number };
const make = (count: number, seed: number, fg: boolean): P[] =>
  new Array(count).fill(0).map((_, i) => {
    const s = seed + i * 7.31;
    let x = rand(s) * 3500;
    if (fg) {
      // bokeh de primeiro plano só nas laterais: nunca cruza o troféu nem o logo
      x = rand(s) < 0.5 ? 80 + rand(s + 9) * 780 : 2640 + rand(s + 9) * 780;
    }
    return {
      x, y: rand(s + 1) * 2000,
      r: fg ? 50 + rand(s + 2) * 90 : 2 + rand(s + 2) * 4.5,
      a: fg ? 0.05 + rand(s + 3) * 0.08 : 0.18 + rand(s + 3) * 0.4,
      k: 1, n: 1 + Math.floor(rand(s + 4) * 3), ph: rand(s + 5) * 6.28, amp: 20 + rand(s + 6) * 60,
    };
  });
const BG = make(90, 1, false);
const FG = make(12, 50, true);

export const Particles: React.FC<{ fg?: number; bg?: number }> = ({ fg = 0, bg = 1 }) => {
  const t = useT();
  const u = useU();
  const { width } = useVideoConfig();
  const H = 2000 + 300;
  const render = (list: P[], isFg: boolean, op: number) =>
    op <= 0.001 ? null : list.map((p, i) => {
      const y = ((p.y - (p.k * H * t) / T) % H + H) % H - 150;
      const x = p.x + p.amp * Math.sin(phase(t, p.n, p.ph));
      // fade nas bordas verticais (sem "pop" no wrap)
      const edge = Math.min(1, Math.max(0, (y + 150) / 260), Math.max(0, (2150 - y) / 260));
      const tw = 0.75 + 0.25 * Math.sin(phase(t, p.n + 2, p.ph * 2));
      const d = u(p.r * 2);
      return (
        <div key={i} style={{
          position: 'absolute', left: u(x) - d / 2, top: u(y) - d / 2, width: d, height: d, borderRadius: '50%',
          opacity: p.a * edge * tw * op,
          background: isFg
            ? `radial-gradient(circle, rgba(${C.whiteRGB},.9) 0%, rgba(${C.whiteRGB},.55) 38%, rgba(${C.whiteRGB},0) 70%)`
            : `radial-gradient(circle, rgba(${C.whiteRGB},1) 0%, rgba(${C.whiteRGB},.5) 45%, rgba(${C.whiteRGB},0) 72%)`,
        }} />
      );
    });
  void width;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {render(BG, false, bg)}
      {render(FG, true, fg)}
    </AbsoluteFill>
  );
};
