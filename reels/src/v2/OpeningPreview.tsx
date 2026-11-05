import React from 'react';
import {AbsoluteFill, useCurrentFrame, spring, Easing} from 'remotion';
import {BLUE, LIGHT, ACCENT, Words, T2, RubberArrow, Burst, Speed, SocialPost, PHONE} from './kit';

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
    const front = beat.id === 'w6' ? -260 + 1700 * pr(f, 100, 130, Easing.bezier(0.45, 0, 0.7, 1)) : -9999;
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

  // ----- seta -----
  let arrow: React.ReactNode = null;
  if (f >= 96 && !cover) {
    const [, wy] = center('w6');
    let x: number;
    let y = wy + 10;
    let rot = 112;
    let stretch = 1;
    let bend = 0;
    let bulge = 0;
    let z = 1;
    if (f < 131) {
      // força para empurrar: corpo inclinado, esticado, tremendo de esforço
      x = -260 + 1700 * pr(f, 100, 130, Easing.bezier(0.45, 0, 0.7, 1)) - 70;
      if (f < 100) x = -200 + 60 * pr(f, 96, 100, outQ);
      stretch = 0.86 + 0.06 * Math.sin(f * 1.7);
      bulge = 0.25;
      bend = 0.15 * Math.sin(f * 0.9);
    } else if (f < 140) {
      // volta para o centro, quicando de alegria
      x = 1200 - 660 * pr(f, 131, 140, outQ);
      y = wy + 40 - 160 * Math.sin(Math.PI * pr(f, 131, 140));
      rot = 112 - 112 * pr(f, 131, 138) - 360 * pr(f, 131, 140);
      stretch = 1 + 0.2 * Math.sin(Math.PI * pr(f, 131, 140));
    } else {
      // mergulha na câmera
      x = 540;
      y = wy + 40;
      rot = -360 - 8 * pr(f, 140, 146);
      z = 1 - 0.97 * pr(f, 140, 146, inQ);
      stretch = 1 + 0.2 * pr(f, 140, 145) + jelly(f, 140, 0.1, 3, 1.4);
    }
    if (post) {
      x = 540 + 280 * pr(f, 149, 168, outQ);
      y = wy + 40 + 300 * pr(f, 149, 168, outQ);
      z = 0.03 + 1.1 * pr(f, 149, 168, outQ);
      rot = -368 + 8 * pr(f, 149, 168);
      stretch = 1 + jelly(f, 166, 0.16, 5, 1.1);
    }
    arrow = <RubberArrow x={x} y={y} rot={rot} scale={1.9 / z} rig={{stretch, bend, bulge, phase: f * 0.5}} fill={post ? BLUE : ACCENT} />;
  }

  return (
    <AbsoluteFill style={{backgroundColor: bg}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <rect width={1080} height={1920} fill={bg} />
        {word}
        {beat?.id === 'w4' && f - 36 >= 8 && f - 36 < 15 ? <Burst x={540} y={990} r={560} n={10} c={BLUE} len={70} /> : null}
        {f >= 102 && f < 128 ? <Speed x={-260 + 1700 * pr(f, 100, 130, Easing.bezier(0.45, 0, 0.7, 1)) - 260} y={center('w6')[1] + 10} c={ACCENT} len={150} ang={180} /> : null}
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
