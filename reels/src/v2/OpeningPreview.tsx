import React from 'react';
import {AbsoluteFill, useCurrentFrame, spring, Easing} from 'remotion';
import {BLUE, LIGHT, ACCENT, Words, T2, RubberArrow, Burst, Speed, SocialPost, PHONE} from './kit';
import {simulateArrow} from './motion';

const io = Easing.bezier(0.65, 0, 0.35, 1);
const outQ = Easing.bezier(0.22, 1, 0.36, 1);
const inQ = Easing.bezier(0.7, 0, 0.84, 0);
const cl = (v: number) => Math.min(1, Math.max(0, v));
const pr = (f: number, a: number, b: number, e = io) => e(cl((f - a) / (b - a)));
const sp = (f: number, s: number, damping = 9, stiffness = 170) => (f < s ? 0 : spring({frame: f - s, fps: 30, config: {damping, stiffness, mass: 1}}));
const jelly = (f: number, s: number, amp = 1, decay = 6, freq = 0.9) => (f < s ? 0 : amp * Math.exp(-(f - s) / decay) * Math.sin((f - s) * freq));
const hs = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};
const center = (id: string): [number, number] => {
  const b = T2[id].lines[0].bb;
  return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
};

// Batidas: uma palavra por vez ocupando a tela, fundo e texto trocam de cor a cada palavra
const BEATS = [
  {id: 'w1', a: 0, b: 12, bg: BLUE, fg: LIGHT},
  {id: 'w2', a: 12, b: 24, bg: LIGHT, fg: BLUE},
  {id: 'w3', a: 24, b: 36, bg: BLUE, fg: LIGHT},
  {id: 'w4', a: 36, b: 60, bg: ACCENT, fg: BLUE},
  {id: 'w5', a: 60, b: 72, bg: BLUE, fg: LIGHT},
  {id: 'w6', a: 72, b: 140, bg: BLUE, fg: ACCENT},
];

export const OpeningPreview: React.FC = () => {
  const f = useCurrentFrame();
  const beat = BEATS.find((b) => f >= b.a && f < b.b);
  const cover = f >= 146 && f < 149;
  const post = f >= 149;
  const bg = post || cover ? ACCENT : beat?.bg ?? BLUE;

  // ----- palavra da batida -----
  let word: React.ReactNode = null;
  if (beat && !post && !cover) {
    const [ox, oy] = center(beat.id);
    const t = f - beat.a;
    let s = 1;
    let shake = 0;
    if (beat.id === 'w4') {
      // vem de longe, passa do tamanho e acomoda com impacto
      s = t < 8 ? 0.08 + 1.12 * inQ(cl(t / 8)) : 1 + 0.2 * Math.exp(-(t - 8) / 2.5) * Math.cos((t - 8) * 0.8);
      shake = t >= 8 && t < 16 ? 10 * Math.exp(-(t - 8) / 3) * Math.sin(t * 2.4) : 0;
    } else if (beat.id === 'w6') {
      // a percepção de tamanho muda: aproxima, afasta, assenta
      s = t < 6 ? 0.7 + 0.3 * outQ(cl(t / 6)) : 1 - 0.32 * Math.pow(Math.sin(Math.max(0, t - 6) * 0.16), 2) * Math.exp(-Math.max(0, t - 6) / 14);
    } else {
      // entra grande e encaixa no lugar, seco e firme
      s = 1 + 0.16 * Math.exp(-t / 2) * Math.cos(t * 0.9);
    }
    // a seta empurra as letras de "percepção." para fora de cena
    const front = beat.id === 'w6' && f >= 96 ? simulateArrow([{f: 96, x: -260, y: 0}, {f: 104, x: 60, y: 0}, {f: 130, x: 1240, y: 0}], Math.min(f, 130)).x + 70 : -9999;
    word = (
      <g transform={`translate(${ox + shake} ${oy}) scale(${s}) translate(${-ox} ${-oy})`}>
        <Words id={beat.id} fn={(l, gi) => {
          if (beat.id !== 'w6') return {color: beat.fg};
          const push = Math.max(0, front - l.bb[0] + 20);
          if (push <= 0) return {color: beat.fg};
          const fly = Math.max(0, push - 60);
          return {
            color: beat.fg,
            dx: push * 0.95 + fly * 0.4,
            dy: -18 * Math.sin(Math.min(Math.PI, push / 60)) + 0.0045 * fly * fly * (1 + 0.4 * hs(gi)),
            rot: Math.min(70, fly * 0.25) * (hs(gi * 3) > -0.3 ? 1 : -1),
          };
        }} />
      </g>
    );
  }

  // ----- seta: trajetória contínua com física -----
  let arrow: React.ReactNode = null;
  if (f >= 96 && !cover) {
    const [, wy] = center('w6');
    const keys = post
      ? [
          {f: 149, x: 540, y: wy - 40, z: 0.03, rest: 0},
          {f: 160, x: 700, y: wy + 160, z: 0.55, rest: -8},
          {f: 172, x: 830, y: wy + 330, z: 1.05, rest: -14},
          {f: 180, x: 840, y: wy + 340, z: 1, rest: -10},
        ]
      : [
          {f: 96, x: -260, y: wy + 30, rest: 0},
          {f: 104, x: 60, y: wy + 10, rest: 0},
          {f: 130, x: 1240, y: wy + 10, rest: 0},
          // vira no ar e volta em arco, comemorando
          {f: 137, x: 900, y: wy - 260, rest: 0},
          {f: 141, x: 560, y: wy - 120, rest: 0},
          {f: 144, x: 540, y: wy - 60, z: 0.45, rest: 0},
          {f: 146, x: 540, y: wy - 40, z: 0.03, rest: 0},
        ];
    const a = simulateArrow(keys, f, {lead: f < 131 ? 1 : 0.8});
    const effort = f >= 104 && f < 130 ? 0.04 * Math.sin(f * 1.9) : 0; // tremor de esforço ao empurrar
    arrow = <RubberArrow x={a.x} y={a.y} rot={a.rot} scale={1.9 / a.z} rig={{stretch: a.stretch - (f >= 104 && f < 130 ? 0.1 : 0), bend: a.bend + effort, wobble: a.wobble, phase: f * 0.6}} fill={post ? BLUE : ACCENT} />;
  }

  return (
    <AbsoluteFill style={{backgroundColor: bg}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <rect width={1080} height={1920} fill={bg} />
        {word}
        {beat?.id === 'w4' && f - 36 >= 8 && f - 36 < 15 ? <Burst x={540} y={990} r={560} n={10} c={BLUE} len={70} /> : null}
        {f >= 104 && f < 128 ? <Speed x={simulateArrow([{f: 96, x: -260, y: 0}, {f: 104, x: 60, y: 0}, {f: 130, x: 1240, y: 0}], f).x - 200} y={center('w6')[1] + 10} c={ACCENT} len={150} ang={180} /> : null}
        {post ? (
          <g transform={`translate(540 ${PHONE.y + PHONE.h / 2}) scale(${0.5 + 0.5 * sp(f, 150, 12, 110)}) translate(-540 ${-(PHONE.y + PHONE.h / 2)})`}>
            <SocialPost c={BLUE} bg={ACCENT} />
          </g>
        ) : null}
        {cover ? <rect width={1080} height={1920} fill={ACCENT} /> : null}
        {arrow}
      </svg>
    </AbsoluteFill>
  );
};
