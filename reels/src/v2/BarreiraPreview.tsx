import React from 'react';
import {AbsoluteFill, useCurrentFrame, spring, Easing} from 'remotion';
import {BLUE, LIGHT, ACCENT, st, Words, T2} from './kit';

const io = Easing.bezier(0.65, 0, 0.35, 1);
const cl = (v: number) => Math.min(1, Math.max(0, v));
const pr = (f: number, a: number, b: number, e = io) => e(cl((f - a) / (b - a)));
const sp = (f: number, s: number, damping = 10, stiffness = 150) => (f < s ? 0 : spring({frame: f - s, fps: 30, config: {damping, stiffness, mass: 1}}));

// "barreira." se divide na horizontal como uma massa elástica e volta a se juntar
export const BarreiraPreview: React.FC = () => {
  const f = useCurrentFrame();
  const line = T2.s5x.lines[1];
  const heavy = line.letters.filter((l) => l.weight === 800);
  const x1 = heavy[0].bb[0];
  const x2 = heavy[heavy.length - 1].bb[2];
  const cx = (x1 + x2) / 2;
  const cutY = line.y - heavy[0].size * 0.35; // meio da altura das maiúsculas

  // abertura suave (sem estalo) e fechamento com balanço elástico
  const opening = pr(f, 18, 36, io);
  const closing = f < 46 ? 0 : sp(f, 46, 7, 70);
  const open = Math.max(-0.12, opening - closing); // leve passada do ponto ao fechar = balanço
  const enter = sp(f, 0, 13, 120);
  const big = 1.3 - 0.3 * pr(f, 0, 16, Easing.bezier(0.22, 1, 0.36, 1));
  const crack = pr(f, 12, 22);

  const letter = (l: (typeof heavy)[number], i: number, top: boolean) => {
    const dir = top ? -1 : 1;
    const u = (((l.bb[0] + l.bb[2]) / 2) - x1) / (x2 - x1);
    // onda contínua que percorre a palavra
    const wave = Math.sin(u * Math.PI * 2.2 - f * 0.22);
    const a = Math.abs(open);
    const dy = top ? -(open * 22 + a * 10 * wave) : open * 50 + a * 16 * wave;
    const dx = dir * open * 18 + a * 10 * Math.cos(u * Math.PI * 2 - f * 0.18);
    const rot = dir * a * 6 * wave;
    const sy = top ? 1 + 0.18 * a * (0.6 + 0.4 * wave) : 1 - 0.14 * a * (0.6 + 0.4 * wave);
    const sx = 1 + 0.05 * a;
    const ox = (l.bb[0] + l.bb[2]) / 2;
    const s = big;
    return (
      <g key={`${top}${i}`} transform={`translate(${cx} ${line.y}) scale(${s}) translate(${-cx} ${-line.y}) translate(${dx} ${dy + (1 - enter) * 160}) translate(${ox} ${cutY}) rotate(${rot}) scale(${sx} ${sy}) translate(${-ox} ${-cutY})`}>
        <path d={l.d} fill={LIGHT} clipPath={`url(#${top ? 'ct' : 'cb'})`} />
      </g>
    );
  };

  const split = Math.abs(open) > 0.004;
  return (
    <AbsoluteFill style={{backgroundColor: BLUE}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <rect width={1080} height={1920} fill={BLUE} />
        <defs>
          <clipPath id="ct"><rect x={-200} y={-200} width={1480} height={cutY + 200} /></clipPath>
          <clipPath id="cb"><rect x={-200} y={cutY} width={1480} height={1920} /></clipPath>
        </defs>
        <Words id="s5x" fn={(l, gi, li) => (li === 0 || l.weight !== 800 ? {dx: li === 1 ? -40 : 0} : {hide: true})} />
        {split ? (
          <>
            {heavy.map((l, i) => letter(l, i, true))}
            {heavy.map((l, i) => letter(l, i, false))}
          </>
        ) : (
          <Words id="s5x" fn={(l, gi, li) => (li === 1 && l.weight === 800 ? {sx: big, sy: big, ox: cx, oy: line.y, dy: (1 - enter) * 160} : {hide: true})} />
        )}
        {/* linha do corte: se desenha e se abre junto com a palavra */}
        {crack > 0 && opening < 0.25 ? <path d={`M${x1 - 20} ${cutY} L${x1 - 20 + (x2 - x1 + 40) * crack} ${cutY}`} {...st(ACCENT, 6 * (1 - opening * 4))} /> : null}
      </svg>
    </AbsoluteFill>
  );
};
