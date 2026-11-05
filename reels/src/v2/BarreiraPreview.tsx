import React from 'react';
import {AbsoluteFill, useCurrentFrame, spring, Easing} from 'remotion';
import {BLUE, LIGHT, ORANGE, st, Words, T2, Arrow2, Speed, Sparkle} from './kit';

const io = Easing.bezier(0.65, 0, 0.35, 1);
const cl = (v: number) => Math.min(1, Math.max(0, v));
const pr = (f: number, a: number, b: number, e = io) => e(cl((f - a) / (b - a)));
const sp = (f: number, s: number, damping = 10, stiffness = 150) => (f < s ? 0 : spring({frame: f - s, fps: 30, config: {damping, stiffness, mass: 0.9}}));

// "barreira." dividida na horizontal, a seta atravessa a passagem e a palavra se junta de novo
export const BarreiraPreview: React.FC = () => {
  const f = useCurrentFrame();
  const line = T2.s5x.lines[1];
  const heavy = line.letters.filter((l) => l.weight === 800);
  const x1 = heavy[0].bb[0] - 20;
  const x2 = heavy[heavy.length - 1].bb[2] + 20;
  const cutY = line.y - heavy[0].size * 0.27; // meio da altura das letras minúsculas
  // abertura: 0 fechado, 1 aberto
  const open = Math.max(0, sp(f, 22, 11, 120) - sp(f, 46, 14, 200));
  const crack = pr(f, 16, 24);
  const join = f >= 46 ? Math.sin(Math.PI * pr(f, 50, 60)) : 0;
  const pulse = 1 + 0.06 * join;
  const enter = sp(f, 0, 12, 160);
  const big = 1.3 - 0.3 * pr(f, 0, 14, Easing.bezier(0.22, 1, 0.36, 1));
  const cx = (x1 + x2) / 2;
  const half = (top: boolean) => (
    <g transform={`translate(${(top ? -30 : 30) * open} ${(top ? -38 : 38) * open})`}>
      <g clipPath={`url(#${top ? 'ct' : 'cb'})`}>
        <Words id="s5x" fn={(l, gi, li) => (li === 1 && l.weight === 800 ? {sx: big * pulse, sy: big * pulse, ox: cx, oy: line.y, dy: (1 - enter) * 160} : {hide: true})} />
      </g>
    </g>
  );
  const ax = -120 + 1320 * pr(f, 26, 44, Easing.bezier(0.5, 0, 0.6, 1));
  return (
    <AbsoluteFill style={{backgroundColor: BLUE}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <rect width={1080} height={1920} fill={BLUE} />
        <defs>
          <clipPath id="ct"><rect x={-200} y={0} width={1480} height={cutY} /></clipPath>
          <clipPath id="cb"><rect x={-200} y={cutY} width={1480} height={1920} /></clipPath>
        </defs>
        <Words id="s5x" fn={(l, gi, li) => (li === 0 || l.weight !== 800 ? {dx: li === 1 ? -40 : 0} : {hide: true})} />
        {open > 0.002 ? (
          <>
            {half(true)}
            {half(false)}
          </>
        ) : (
          <Words id="s5x" fn={(l, gi, li) => (li === 1 && l.weight === 800 ? {sx: big * pulse, sy: big * pulse, ox: cx, oy: line.y, dy: (1 - enter) * 160} : {hide: true})} />
        )}
        {/* linha do corte: se desenha antes de abrir */}
        {crack > 0 && open < 0.15 && f < 40 ? <path d={`M${x1} ${cutY} L${x1 + (x2 - x1) * crack} ${cutY}`} {...st(ORANGE, 6)} /> : null}
        {/* a seta atravessa a passagem */}
        {f >= 26 && f < 46 ? (
          <>
            <Arrow2 x={ax} y={cutY} rot={135} sx={1.3} sy={0.62} scale={0.75} />
            <Speed x={ax - 70} y={cutY} c={ORANGE} len={120} ang={180} />
          </>
        ) : null}
        {f >= 52 ? (
          <>
            <Sparkle x={x1 - 10} y={cutY - 90} c={ORANGE} s={0.8 * pr(f, 52, 58)} />
            <Sparkle x={x2 + 6} y={cutY - 70} c={ORANGE} s={0.6 * pr(f, 54, 60)} />
          </>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};
