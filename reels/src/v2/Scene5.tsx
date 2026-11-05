import React from 'react';
import {AbsoluteFill, useCurrentFrame, Easing} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {BLUE, LIGHT, ACCENT, T2, RubberArrow, HEART_D} from './kit';

// ============ CENA 5: VIRADA (final) ============
const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
const expoIn = Easing.bezier(0.7, 0, 0.84, 0);
const expoIO = Easing.bezier(0.87, 0, 0.13, 1);
const cl = (v: number) => Math.min(1, Math.max(0, v));
const pr = (f: number, a: number, b: number, e: (t: number) => number = expoOut) => e(cl((f - a) / (b - a)));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const LINE_Y = 1000; // linha herdada da rampa achatada
const EXPAND1 = 0; // a linha se expande e muda a tela para claro
const A_IN = 18; // "Sentiu desconforto?"
const A_OUT = 84;
const B_IN = 96; // "A dificuldade estava na BARREIRA."
const WALL = 120; // BARREIRA se estica na vertical e vira um muro
const WALL_S = 5.2;
const COLLAPSE = 182; // o muro desaba numa linha
const EXPAND2 = 196; // a linha se expande e muda a tela para azul
const WRITE = 214; // ACESSIBILIDADE escrita traço a traço
const PULSE = 262;
const CLICK_A = 286; // a seta clica em ACESSIBILIDADE
const LIKES = CLICK_A + 2; // curtidas sobem de baixo e cobrem a tela
export const SCENE5_LEN = LIKES + 62;

// curtidas: corações que sobem de baixo, cada vez mais numerosos e maiores, até cobrir a tela
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const HEARTS = Array.from({length: 170}, (_, i) => {
  const k = i / 170;
  return {
    t0: LIKES + 40 * Math.pow(k, 0.7), // nascem cada vez mais rápido
    x: 40 + 1000 * hash(i * 3.1),
    s: lerp(0.9, 9, Math.pow(k, 2.2)) * (0.8 + 0.4 * hash(i * 7.7)), // cada vez maiores
    v: 34 + 30 * hash(i * 5.3),
    sway: 30 * (hash(i * 9.1) - 0.5),
    c: hash(i * 2.2) > 0.3 ? ACCENT : LIGHT,
  };
});

const B_LINE = T2.S5b.lines[1];
const BAR = B_LINE.letters.filter((l) => l.weight === 800); // BARREIRA.
const BX1 = BAR[0].bb[0];
const BX2 = BAR[BAR.length - 1].bb[2];
const BASE = B_LINE.y;
const CAP = BAR[0].size * 0.7;

const lineClip = (id: string, li: number, k: string) => {
  const ln = T2[id].lines[li];
  const top = ln.bb[1] - 40;
  return (
    <clipPath id={k} key={k}>
      <rect x={-400} y={top} width={1880} height={ln.y + ln.letters[0].size * 0.32 - top} />
    </clipPath>
  );
};

// texto que sobe da linha de base (máscara por linha) e desce ao sair
const Rise: React.FC<{id: string; f: number; ins: number[]; out?: number; color: string; skip?: (l: (typeof BAR)[number]) => boolean; dy?: number[]}> = ({id, f, ins, out = 1e4, color, skip, dy}) => (
  <g>
    {T2[id].lines.map((ln, li) => (
      <g key={li} transform={`translate(0 ${dy?.[li] ?? 0})`}>
        <g clipPath={`url(#${id}c${li})`}>
          {ln.letters.map((l, i) => {
            if (skip && skip(l)) return null;
            const st = ins[li] + i * 0.7;
            if (f < st) return null;
            const p = pr(f, st, st + 14);
            const e = pr(f, out + li * 2, out + li * 2 + 12, expoIn);
            return <path key={i} d={l.d} fill={l.color === 'O' ? ACCENT : color} transform={`translate(0 ${(1 - p + e) * l.size * 1.3})`} />;
          })}
        </g>
      </g>
    ))}
  </g>
);

const Scene: React.FC = () => {
  const f = useCurrentFrame();

  // ---- 1ª expansão: a linha clara engrossa e toma a tela ----
  const band1 = lerp(11, 2300, pr(f, EXPAND1, EXPAND1 + 18, expoIO));
  // ---- muro: BARREIRA cresce a partir da base ----
  const wallS = lerp(1, WALL_S, pr(f, WALL, WALL + 20, expoIO));
  const collapse = pr(f, COLLAPSE, COLLAPSE + 12, expoIn);
  const sy = lerp(wallS, 11 / CAP, collapse); // desaba até virar uma linha da espessura do traço
  const wallTop = BASE - CAP * sy;
  // a linha de cima é empurrada para o alto pelo muro
  const push = Math.min(0, wallTop - 40 - (T2.S5b.lines[0].y + 10)) * (1 - collapse);
  // ---- 2ª expansão: a linha do muro desabado engrossa e toma a tela de azul ----
  const band2 = f >= EXPAND2 ? lerp(11, 2400, pr(f, EXPAND2, EXPAND2 + 18, expoIO)) : 0;
  const lineY2 = BASE - 5.5;

  // ---- ACESSIBILIDADE: escrita traço a traço, letra por letra, e pulso único ----
  const pulse = 1 + 0.05 * Math.sin(Math.PI * pr(f, PULSE, PULSE + 12, expoIO)) + 0.07 * Math.sin(Math.PI * pr(f, CLICK_A, CLICK_A + 10, expoIO));
  const finalText =
    f >= WRITE ? (
      <g transform={`translate(540 960) scale(${pulse}) translate(-540 -960)`}>
        {T2.S5c.lines[0].letters.map((l, i) => {
          const st = WRITE + i * 2;
          if (f < st) return null;
          const draw = pr(f, st, st + 12, expoIO);
          const fill = pr(f, st + 8, st + 16, expoOut);
          const cx = (l.bb[0] + l.bb[2]) / 2;
          const cy = (l.bb[1] + l.bb[3]) / 2;
          return (
            <g key={`c${i}`}>
              <path d={l.d} fill="none" stroke={ACCENT} strokeWidth={5} strokeLinejoin="round" pathLength={1} strokeDasharray={`${draw} 2`} />
              {fill > 0 ? <path d={l.d} fill={ACCENT} transform={`translate(${cx} ${cy}) scale(${fill}) translate(${-cx} ${-cy})`} /> : null}
            </g>
          );
        })}
        <Rise id="S5c" f={f} ins={[1e4, WRITE + 30]} color={LIGHT} />
      </g>
    ) : null;

  // ---- SETA ----
  let ax = 860;
  let ay = 1110;
  let rot = -20;
  let stretch = 1;
  let sc = 1.12;
  // "Sentiu desconforto?": se encolhe e vira o rosto, incomodada
  if (f >= A_IN && f < B_IN) {
    const t = pr(f, A_IN + 6, A_IN + 22, expoIO) * (1 - pr(f, A_OUT, A_OUT + 12, expoIO));
    rot = lerp(-20, 40, t);
    stretch = lerp(1, 0.84, t);
    sc = lerp(1.12, 1.02, t);
    ax = lerp(860, 900, t);
    ay = lerp(1110, 1130, t);
  }
  // diante do muro: recua e olha para cima, pequena
  if (f >= WALL - 6 && f < COLLAPSE + 14) {
    const t = pr(f, WALL - 6, WALL + 16, expoIO);
    ax = lerp(860, 930, t);
    ay = lerp(1110, 1200, t);
    rot = lerp(-20, 8, t);
    sc = lerp(1.12, 0.95, t);
    stretch = lerp(1, 0.9, t);
    // desaba o muro: um pulinho de alívio
    if (f >= COLLAPSE) {
      const j = Math.sin(Math.PI * pr(f, COLLAPSE, COLLAPSE + 14, expoIO));
      ay -= 70 * j;
      stretch = 0.9 + 0.2 * j;
      rot = 8 - 20 * j;
    }
  }
  // final: vai para o centro, embaixo da frase, comemora com o pulso e fica viva
  if (f >= COLLAPSE + 14) {
    const t = pr(f, COLLAPSE + 14, COLLAPSE + 40, expoIO);
    ax = lerp(930, 540, t);
    ay = lerp(1200, 1330, t) - 140 * Math.sin(Math.PI * t);
    rot = lerp(-12, -20 - 360, t);
    sc = lerp(0.95, 1.6, t);
    stretch = 1;
    const hop = Math.sin(Math.PI * pr(f, PULSE - 4, PULSE + 12, expoIO));
    ay -= 110 * hop;
    stretch += 0.12 * hop - 0.1 * Math.sin(Math.PI * pr(f, PULSE + 12, PULSE + 18, expoIO));
    if (f > PULSE + 18 && f < CLICK_A - 14) {
      const b = Math.sin(((f - PULSE - 18) / 40) * Math.PI * 2);
      ay += 6 * b;
      rot += 4 * b;
      stretch = 1 + 0.03 * b;
    }
    // vai até ACESSIBILIDADE e clica (pela ponta direita da palavra, sem cobrir "é direito.")
    if (f >= CLICK_A - 14) {
      const k = 1.6;
      const r = -20;
      const an = (r * Math.PI) / 180;
      const d0 = [-0.336 * 64.8 * k, -0.942 * 64.8 * k];
      const tip = [d0[0] * Math.cos(an) - d0[1] * Math.sin(an), d0[0] * Math.sin(an) + d0[1] * Math.cos(an)];
      const w = T2.S5c.lines[0].bb;
      const target = [w[2] - 110 - tip[0], w[3] + 8 - tip[1]];
      const t = pr(f, CLICK_A - 14, CLICK_A - 2, expoIO);
      ax = lerp(540, target[0], t);
      ay = lerp(1330, target[1], t) - 80 * Math.sin(Math.PI * t);
      rot = lerp(-380, -380, t);
      stretch = 1 - 0.14 * Math.sin(Math.PI * pr(f, CLICK_A, CLICK_A + 6, expoIO));
    }
  }
  const inLight1 = Math.abs(ay - LINE_Y) < band1 / 2;
  const inBlue2 = f >= EXPAND2 && Math.abs(ay - lineY2) < band2 / 2;
  const arrowColor = inBlue2 ? ACCENT : inLight1 ? BLUE : ACCENT;

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      <defs>
        {[0, 1].map((li) => lineClip('S5a', li, `S5ac${li}`))}
        {[0, 1].map((li) => lineClip('S5b', li, `S5bc${li}`))}
        {[0, 1].map((li) => lineClip('S5c', li, `S5cc${li}`))}
      </defs>
      <rect width={1080} height={1920} fill={BLUE} />
      {/* a linha clara se expande e toma a tela */}
      <rect x={-20} y={LINE_Y - band1 / 2} width={1120} height={band1} fill={LIGHT} rx={band1 < 40 ? band1 / 2 : 0} />
      {f >= A_IN && f < A_OUT + 20 ? <Rise id="S5a" f={f} ins={[A_IN, A_IN + 5]} out={A_OUT} color={BLUE} /> : null}
      {f >= B_IN && f < EXPAND2 + 20 ? (
        <>
          <Rise id="S5b" f={f} ins={[B_IN, B_IN + 5]} out={COLLAPSE} color={BLUE} skip={(l) => l.weight === 800 && f >= WALL} dy={[push, 0]} />
          {/* BARREIRA: cresce na vertical a partir da base e vira muro; depois desaba numa linha */}
          {f >= WALL ? (
            <g transform={`translate(0 ${BASE}) scale(1 ${sy}) translate(0 ${-BASE})`}>
              {BAR.map((l, i) => <path key={i} d={l.d} fill={BLUE} />)}
            </g>
          ) : null}
        </>
      ) : null}
      {/* a linha do muro desabado se expande e toma a tela de azul */}
      {f >= EXPAND2 ? <rect x={-20} y={lineY2 - band2 / 2} width={1120} height={band2} fill={BLUE} /> : null}
      {finalText}
      <RubberArrow x={ax} y={ay} rot={rot} scale={sc} rig={{stretch}} fill={arrowColor} />
      {HEARTS.map((h, i) => {
        if (f < h.t0) return null;
        const t = f - h.t0;
        const y = 2000 + 40 * h.s - h.v * t * (1 + t * 0.02);
        if (y < -120 * h.s) return null;
        const x = h.x + h.sway * Math.sin(t * 0.25 + i);
        const sc2 = h.s * Math.min(1, 0.4 + t * 0.12);
        return <path key={i} d={HEART_D} fill={h.c} transform={`translate(${x} ${y}) rotate(${8 * Math.sin(t * 0.2 + i)}) scale(${sc2})`} />;
      })}
      {/* fecho: a tela termina coberta de curtidas */}
      {f >= LIKES + 54 ? <rect width={1080} height={1920} fill={ACCENT} /> : null}
    </svg>
  );
};

export const Scene5: React.FC<{blur?: boolean}> = ({blur = true}) => (
  <AbsoluteFill style={{backgroundColor: BLUE}}>
    {blur ? (
      <CameraMotionBlur shutterAngle={180} samples={8}>
        <Scene />
      </CameraMotionBlur>
    ) : (
      <Scene />
    )}
  </AbsoluteFill>
);
