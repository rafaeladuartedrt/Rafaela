import React from 'react';
import {AbsoluteFill, useCurrentFrame, Easing} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {BLUE, LIGHT, ACCENT, T2, RubberArrow, STAIRS3, RAMP3, st} from './kit';

// ============ CENA 4: MOBILIDADE ============
const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
const expoIn = Easing.bezier(0.7, 0, 0.84, 0);
const expoIO = Easing.bezier(0.87, 0, 0.13, 1);
const cl = (v: number) => Math.min(1, Math.max(0, v));
const pr = (f: number, a: number, b: number, e: (t: number) => number = expoOut) => e(cl((f - a) / (b - a)));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const HIT1 = 44;
const HIT2 = 76;
const MORPH = 100; // a linha da escada vira rampa
const CLIMB = [120, 156];
const CLICK = 160;
const FLATTEN = 228; // a rampa se achata numa linha horizontal (transição)
export const SCENE4_LEN = FLATTEN + 24;

const BTN = {cx: 810, cy: 896, h: 96};
const SC = 1.12; // seta proporcional ao degrau
const FLAT_Y = 1000;
const FLAT: [number, number][] = STAIRS3.map((_, i) => [lerp(-40, 1120, i / (STAIRS3.length - 1)), FLAT_Y]);

const Gesture: React.FC<{d: string; t: number; color: string; w?: number}> = ({d, t, color, w = 10}) => {
  if (t <= 0 || t >= 1) return null;
  const head = expoOut(cl(t / 0.65));
  const tail = expoIn(cl((t - 0.3) / 0.7));
  return <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={w * (1 - 0.5 * tail)} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${Math.max(0.001, head - tail)} 2`} strokeDashoffset={-tail} />;
};
// nuvem de irritação: se desenha, fica e se recolhe
const Anger: React.FC<{x: number; y: number; t: number; color: string}> = ({x, y, t, color}) => {
  if (t <= 0 || t >= 1) return null;
  const head = expoOut(cl(t / 0.3));
  const tail = expoIn(cl((t - 0.8) / 0.2));
  const s = 1.5;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-46 6 C-56 -20 -20 -34 -8 -14 C-4 -40 34 -38 30 -10 C56 -16 58 20 30 18 C34 40 -2 42 -6 20 C-24 40 -60 30 -46 6 Z" pathLength={1} fill="none" stroke={color} strokeWidth={10 / s} strokeLinejoin="round" strokeDasharray={`${Math.max(0.001, head - tail)} 2`} strokeDashoffset={-tail} />
      {head > 0.9 && tail < 0.5 ? <path d="M-22 -4 L-6 8 M-6 -4 L-22 8 M8 -4 L24 8 M24 -4 L8 8" fill="none" stroke={color} strokeWidth={9 / s} strokeLinecap="round" /> : null}
    </g>
  );
};

const lerpPts = (A: [number, number][], B: [number, number][], t: number) => A.map((p, i) => [lerp(p[0], B[i][0], t), lerp(p[1], B[i][1], t)] as [number, number]);
const toD = (P: [number, number][]) => P.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

const lineClip = (id: string, li: number, k: string) => {
  const ln = T2[id].lines[li];
  const top = ln.bb[1] - 40;
  return (
    <clipPath id={k} key={k}>
      <rect x={-400} y={top} width={1880} height={ln.y + ln.letters[0].size * 0.32 - top} />
    </clipPath>
  );
};

// ponta da seta a partir do pivô (rotação r, escala k)
const tipOff = (r: number, k: number): [number, number] => {
  const an = (r * Math.PI) / 180;
  const d0: [number, number] = [-0.336 * 64.8 * k, -0.942 * 64.8 * k];
  return [d0[0] * Math.cos(an) - d0[1] * Math.sin(an), d0[0] * Math.sin(an) + d0[1] * Math.cos(an)];
};

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const morph = pr(f, MORPH, MORPH + 16, expoIO);
  const flat = pr(f, FLATTEN, FLATTEN + 16, expoIO);
  const line = lerpPts(lerpPts(STAIRS3, RAMP3, morph), FLAT, flat);
  // o azul sobe junto com a rampa: varredura diagonal de baixo para cima
  const sweep = lerp(-2000, 760, pr(f, MORPH + 2, MORPH + 22, expoIO)); // fronteira: 0,6x − y = sweep

  // ---- texto-problema em degraus: cada linha desce um degrau a partir da anterior ----
  const problem = (col: string) =>
    T2.P4.lines.map((ln, li) => {
      const s0 = 4 + li * 5;
      if (f < s0) return null;
      const p = pr(f, s0, s0 + 12, expoOut);
      const e = pr(f, MORPH - 6 + li * 2, MORPH + 4 + li * 2, expoIn);
      const prev = li === 0 ? [0, -120] : [T2.P4.lines[li - 1].letters[0].x - ln.letters[0].x, T2.P4.lines[li - 1].y - ln.y];
      const dx = prev[0] * (1 - p); // desliza do recuo da linha anterior
      const dy = (1 - p) * ln.letters[0].size * 1.2; // e nasce da própria linha de base
      void prev[1];
      return (
        <g key={li} clipPath={`url(#P4c${li})`}>
          <g transform={`translate(${dx} ${dy + e * ln.letters[0].size * 1.3})`}>
            {ln.letters.map((l, i) => <path key={i} d={l.d} fill={col} />)}
          </g>
        </g>
      );
    });

  // ---- texto-solução: bloco justificado que sobe da linha de base ----
  const solution = () =>
    T2.S4.lines.map((ln, li) =>
      ln.letters.map((l, i) => {
        const s0 = MORPH + 14 + li * 5 + i * 0.6;
        if (f < s0) return null;
        const p = pr(f, s0, s0 + 14);
        const e = pr(f, FLATTEN - 4 + li * 2, FLATTEN + 6 + li * 2, expoIn);
        return (
          <g key={`${li}-${i}`} clipPath={`url(#S4c${li})`}>
            <path d={l.d} fill={l.color === 'O' ? ACCENT : LIGHT} transform={`translate(0 ${((1 - p) + e) * l.size * 1.3})`} />
          </g>
        );
      }),
    );

  // ---- botão Seguir / Seguindo ----
  const following = f >= CLICK;
  const button = (c: string, bg: string) => {
    const pIn = pr(f, 14, 26, expoOut);
    if (pIn <= 0) return null;
    const label = following ? 'segd' : 'seg';
    const w = lerp(T2.seg.lines[0].bb[2] + 70, T2.segd.lines[0].bb[2] + 70, pr(f, CLICK, CLICK + 10, expoOut));
    const pop = 1 + 0.12 * Math.sin(Math.PI * pr(f, CLICK, CLICK + 8, expoIO));
    const out = 1 - pr(f, FLATTEN - 2, FLATTEN + 8, expoIn);
    const s = pIn * pop * out;
    if (s <= 0.001) return null;
    const tw = T2[label].lines[0].bb[2];
    return (
      <g transform={`translate(${BTN.cx} ${BTN.cy}) scale(${s})`}>
        <rect x={-w / 2} y={-BTN.h / 2} width={w} height={BTN.h} rx={BTN.h / 2} {...st(c, 9, following ? c : bg)} />
        <g transform={`translate(${-tw / 2} 22)`}>
          {T2[label].lines[0].letters.map((l, i) => <path key={i} d={l.d} fill={following ? bg : c} />)}
        </g>
      </g>
    );
  };

  // ---- SETA ----
  const START: [number, number] = [130, 1338];
  let ax = START[0];
  let ay = START[1];
  let rot = -10;
  let stretch = 1;
  let sc = SC;
  const RIGHT = 100; // ponta voltada para a direita, correndo para o degrau
  const hitPos = (k: number): [number, number] => {
    const o = tipOff(RIGHT, k);
    return [250 - 8 - o[0], 1335 - o[1]];
  };
  const hp = hitPos(SC);
  const attempt = (s0: number, hit: number, back: number) => {
    // antecipação, corrida, impacto (amassa contra a parede) e recuo
    const tA = pr(f, s0, s0 + 8, expoIO);
    const tR = pr(f, s0 + 8, hit, expoIn);
    ax = lerp(lerp(START[0], START[0] - 40, tA), hp[0], tR);
    ay = lerp(START[1], hp[1], tR);
    rot = lerp(lerp(-10, RIGHT - 20, tA), RIGHT, tR);
    stretch = 1 + 0.1 * tA * (1 - tR) + 0.14 * tR;
    if (f >= hit) {
      const sq = Math.sin(Math.PI * pr(f, hit, hit + 8, expoOut));
      const tB = pr(f, hit + 4, hit + 4 + back, expoOut);
      ax = lerp(hp[0], START[0] - 10, tB) + 4 * sq;
      ay = lerp(hp[1], START[1], tB) - 60 * Math.sin(Math.PI * tB);
      rot = lerp(RIGHT, -10, tB) + 25 * Math.sin(Math.PI * tB);
      stretch = 1 - 0.32 * sq;
    }
  };
  if (f >= 28 && f < 60) attempt(28, HIT1, 12);
  if (f >= 60 && f < 96) attempt(60, HIT2, 14);
  // frustração depois da segunda batida: balança em negação e murcha
  if (f >= HIT2 + 18 && f < MORPH + 8) {
    const t = f - (HIT2 + 18);
    rot = -10 + 14 * Math.sin(t * 0.9) * Math.exp(-t / 8);
    stretch = lerp(1, 0.86, pr(f, HIT2 + 18, HIT2 + 30));
    sc = lerp(SC, SC * 0.9, pr(f, HIT2 + 18, HIT2 + 30));
    ax = START[0] - 10;
    ay = START[1] + 6;
  }
  // a escada vira rampa: levanta, olha e sobe tranquila até o botão
  const rampAt = (u: number): [number, number] => [lerp(60, 690, u), lerp(1400, 950, u)];
  if (f >= MORPH + 8) {
    const t0 = pr(f, MORPH + 8, CLIMB[0], expoIO);
    sc = lerp(SC * 0.9, SC, t0);
    stretch = lerp(0.86, 1, t0);
    rot = lerp(-10, -38, t0);
    ax = START[0] - 10 + 10 * t0;
    ay = START[1] + 6 - 6 * t0;
    if (f >= CLIMB[0]) {
      const u = pr(f, CLIMB[0], CLIMB[1], Easing.bezier(0.45, 0, 0.35, 1));
      const p = rampAt(lerp(0.12, 1.02, u));
      ax = p[0] + 30;
      ay = p[1] - 64;
      rot = -38 + 4 * Math.sin(u * Math.PI * 4);
      if (f >= CLIMB[1]) {
        const o = tipOff(-30, SC);
        const target: [number, number] = [BTN.cx - 70 - o[0], BTN.cy + 10 - o[1]];
        const t = pr(f, CLIMB[1], CLICK, expoIO);
        ax = lerp(p[0] + 30, target[0], t);
        ay = lerp(p[1] - 64, target[1], t);
        rot = lerp(-38, -30, t);
        stretch = 1 - 0.14 * Math.sin(Math.PI * pr(f, CLICK, CLICK + 6, expoIO));
        if (f >= CLICK + 8) {
          // comemora: pula e gira ao lado do botão
          const t2 = pr(f, CLICK + 8, CLICK + 30, expoIO);
          ax = lerp(target[0], 560, t2);
          ay = lerp(target[1], 1040, t2) - 200 * Math.sin(Math.PI * t2);
          rot = lerp(-30, -24 - 360, t2);
          stretch = 1 + 0.1 * Math.sin(Math.PI * t2);
        }
        if (f >= FLATTEN) {
          // desce para a linha horizontal da próxima cena
          const t3 = pr(f, FLATTEN, FLATTEN + 16, expoIO);
          ax = lerp(560, 860, t3);
          ay = lerp(1040, FLAT_Y + 110, t3) - 80 * Math.sin(Math.PI * t3);
          rot = lerp(-384, -380, t3);
        }
      }
    }
  }

  const inBlue = f >= MORPH + 2 && 0.6 * ax - ay < sweep;
  const arrowColor = inBlue ? ACCENT : BLUE;

  const gestures: React.ReactNode[] = [];
  [HIT1, HIT2].forEach((h, n) => {
    if (f >= h && f < h + 16)
      [-1, 0, 1].forEach((k) =>
        gestures.push(
          <Gesture key={`i${n}${k}`} t={(f - h - Math.abs(k)) / 14} color={BLUE} w={n ? 12 : 10} d={`M${262} ${1320 + k * 50} Q${300} ${1300 + k * 70} ${330 + (n ? 30 : 0)} ${1290 + k * 100}`} />,
        ),
      );
  });
  if (f >= CLICK && f < CLICK + 18)
    [-1, 0, 1].forEach((k) =>
      gestures.push(<Gesture key={`c${k}`} t={(f - CLICK - Math.abs(k)) / 16} color={ACCENT} d={`M${BTN.cx + 40 + k * 60} ${BTN.cy - 70} Q${BTN.cx + 50 + k * 80} ${BTN.cy - 130} ${BTN.cx + 40 + k * 110} ${BTN.cy - 190}`} />),
    );

  const scene = (bg: string, c: string, txt: React.ReactNode) => (
    <>
      <rect width={1080} height={1920} fill={bg} />
      {txt}
      <path d={toD(line)} {...st(c, 11)} />
      {button(c, bg)}
    </>
  );

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      <defs>
        {[0, 1, 2, 3].map((li) => lineClip('P4', li, `P4c${li}`))}
        {[0, 1, 2].map((li) => lineClip('S4', li, `S4c${li}`))}
        <clipPath id="sweep4"><path d={`M-100 ${-60 - sweep} L1200 ${720 - sweep} L1200 2400 L-100 2400 Z`} /></clipPath>
      </defs>
      {scene(LIGHT, BLUE, problem(BLUE))}
      {f >= MORPH + 2 ? <g clipPath="url(#sweep4)">{scene(BLUE, LIGHT, solution())}</g> : null}
      {gestures}
      <RubberArrow x={ax} y={ay} rot={rot} scale={sc} rig={{stretch}} fill={arrowColor} />
    </svg>
  );
};

export const Scene4: React.FC<{blur?: boolean}> = ({blur = true}) => (
  <AbsoluteFill style={{backgroundColor: LIGHT}}>
    {blur ? (
      <CameraMotionBlur shutterAngle={180} samples={8}>
        <Scene />
      </CameraMotionBlur>
    ) : (
      <Scene />
    )}
  </AbsoluteFill>
);
