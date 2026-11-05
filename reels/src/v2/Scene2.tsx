import React from 'react';
import {AbsoluteFill, useCurrentFrame, Easing} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {BLUE, LIGHT, ACCENT, T2, RubberArrow, SocialPost, PHONE} from './kit';

// ============ CENA 2: VISÃO ============
const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
const expoIn = Easing.bezier(0.7, 0, 0.84, 0);
const expoIO = Easing.bezier(0.87, 0, 0.13, 1);
const cl = (v: number) => Math.min(1, Math.max(0, v));
const pr = (f: number, a: number, b: number, e: (t: number) => number = expoOut) => e(cl((f - a) / (b - a)));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// câmera sobre o celular: escala e centro vertical
const camK = (f: number) => lerp(1.05, 0.66, pr(f, 6, 26, expoIO));
const camY = (f: number) => lerp(890, 1135, pr(f, 6, 26, expoIO));
const mapP = (f: number, x: number, y: number): [number, number] => [540 + (x - 540) * camK(f), camY(f) + (y - 890) * camK(f)];
const phoneT = (f: number) => `translate(540 ${camY(f)}) scale(${camK(f)}) translate(-540 -890)`;

// posição do selo AD dentro do post (coordenadas do celular)
const PX = PHONE.x + 44;
const PY = PHONE.y + 150;
const AD_P: [number, number] = [PX + 100, PY + 66];
const HEART_P: [number, number] = [PX + 26, PY + (PHONE.w - 88) + 52];

const AD_START = 90;
const LIGHT_ON = 104; // o AD "acende" e a cor se espalha a partir dele
const CLICK = 150;

// Traço de gesto: nasce, viaja e se recolhe
const Gesture: React.FC<{d: string; t: number; color: string; w?: number}> = ({d, t, color, w = 10}) => {
  if (t <= 0 || t >= 1) return null;
  const head = expoOut(cl(t / 0.65));
  const tail = expoIn(cl((t - 0.3) / 0.7));
  return <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={w * (1 - 0.5 * tail)} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${Math.max(0.001, head - tail)} 2`} strokeDashoffset={-tail} />;
};
// ponto de interrogação desenhado como gesto
const QMark: React.FC<{x: number; y: number; t: number; color: string; s?: number; rot?: number}> = ({x, y, t, color, s = 1, rot = 0}) => {
  if (t <= 0 || t >= 1) return null;
  const dot = t > 0.45 && t < 0.85 ? 7 * Math.sin(Math.PI * cl((t - 0.45) / 0.4)) : 0;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <Gesture t={t} color={color} w={10} d="M-22 -30 C-24 -62 24 -66 24 -32 C24 -10 0 -8 0 18" />
      {dot > 0.3 ? <circle cx={0} cy={46} r={dot} fill={color} /> : null}
    </g>
  );
};

const lineClip = (id: string, li: number, k: string) => {
  const ln = T2[id].lines[li];
  const top = ln.bb[1] - 40;
  return (
    <clipPath id={k} key={k}>
      <rect x={-400} y={top} width={1880} height={ln.y + ln.letters[0].size * 0.32 - top} />
    </clipPath>
  );
};
const TextBlock: React.FC<{id: string; f: number; start: number[]; exit?: number; colors: Record<string, string>}> = ({id, f, start, exit = 1e4, colors}) => (
  <g>
    {T2[id].lines.map((ln, li) =>
      ln.letters.map((l, i) => {
        const st = start[li] + i * 0.8;
        if (f < st) return null;
        const p = pr(f, st, st + 14);
        const e = pr(f, exit + li * 2, exit + li * 2 + 10, expoIn);
        return (
          <g key={`${li}-${i}`} clipPath={`url(#${id}c${li})`}>
            <path d={l.d} fill={colors[l.color]} transform={`translate(0 ${((1 - p) + e) * l.size * 1.3})`} />
          </g>
        );
      }),
    )}
  </g>
);

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const wipe = 2400 * pr(f, LIGHT_ON, LIGHT_ON + 18, expoIO);
  const adC = mapP(f, AD_P[0], AD_P[1]);

  // desfoque progressivo da foto (baixa visão); volta a ficar nítida quando o AD acende
  const blurA = 18 * pr(f, 24, 62, Easing.bezier(0.45, 0, 0.55, 1));
  const blurB = blurA * (1 - pr(f, LIGHT_ON, LIGHT_ON + 14));
  // a frase-problema também desfoca por no máximo 1 segundo
  const textBlur = 9 * Math.sin(Math.PI * cl((f - 54) / 26)) * (f >= 54 && f < 80 ? 1 : 0);

  // ---- SETA ----
  const rest = mapP(f, 330, 1290);
  let ax = rest[0];
  let ay = rest[1];
  let rot = -12;
  let sc = 1.7 * camK(f);
  let stretch = 1;
  // percebe a foto ficando turva: inclina a ponta na direção dela
  if (f >= 28 && f < 44) rot = -12 + 30 * pr(f, 28, 40, expoIO);
  // perdida: se afasta da câmera e procura, com pausas e hesitação
  if (f >= 44 && f < 116) {
    const t = (f - 44) / 72;
    const z = 1 + 0.55 * pr(f, 44, 60, expoIO) - 0.55 * pr(f, 108, 116, expoIO);
    const path = [
      [rest[0], rest[1]],
      [820, 1230],
      [860, 900],
      [260, 860],
      [230, 1250],
      [rest[0], rest[1]],
    ];
    const seg = Math.min(4, Math.floor(t * 5));
    const u = expoIO(cl(t * 5 - seg));
    ax = lerp(path[seg][0], path[seg + 1][0], u);
    ay = lerp(path[seg][1], path[seg + 1][1], u) - 50 * Math.sin(Math.PI * u);
    rot = 18 + [-30, 25, -35, 20, -10][seg] * Math.sin(Math.PI * u) + (seg === 2 ? 360 * u : 0);
    sc = (1.7 * camK(f)) / z;
    stretch = 1 + 0.06 * Math.sin(Math.PI * u);
  }
  // reencontra o caminho: volta perto, quica de alegria e clica no coração
  const heart = mapP(f, HEART_P[0], HEART_P[1]);
  if (f >= 116) {
    const t = pr(f, 116, 140, expoIO);
    ax = lerp(rest[0], heart[0] + 38, t);
    ay = lerp(rest[1], heart[1] + 62, t) - 140 * Math.sin(Math.PI * t);
    rot = lerp(18, -14, t) - 360 * pr(f, 118, 136, expoIO);
    sc = 1.7 * camK(f) * (1 + 0.15 * Math.sin(Math.PI * t));
    // antecipação e clique
    const ant = pr(f, 140, 146, expoOut) * (1 - pr(f, 146, CLICK, expoIn));
    ax += 14 * ant;
    ay += 20 * ant;
    stretch = 1 + 0.08 * ant - 0.14 * Math.sin(Math.PI * pr(f, CLICK, CLICK + 6, expoIO));
  }
  const inBlue = Math.hypot(ax - adC[0], ay - adC[1]) < wipe;
  const arrowColor = inBlue ? ACCENT : BLUE;
  const heartFill = f >= CLICK ? pr(f, CLICK, CLICK + 10) : 0;

  const gestures: React.ReactNode[] = [];
  gestures.push(<QMark key="q1" x={ax + 70} y={ay - 170} t={(f - 58) / 22} color={arrowColor} rot={-10} />);
  gestures.push(<QMark key="q2" x={ax - 60} y={ay - 150} t={(f - 80) / 20} color={arrowColor} s={0.75} rot={12} />);
  if (f >= CLICK && f < CLICK + 18) {
    [-1, 0, 1].forEach((k) =>
      gestures.push(<Gesture key={`h${k}`} t={(f - CLICK - Math.abs(k)) / 16} color={ACCENT} d={`M${heart[0] - 10 + k * 30} ${heart[1] - 40} Q${heart[0] - 20 + k * 50} ${heart[1] - 90} ${heart[0] - 10 + k * 80} ${heart[1] - 140}`} />),
    );
  }

  const phone = (c: string, bg: string, blur: number, uid: string, heartColor?: string) => (
    <g transform={phoneT(f)}>
      <SocialPost uid={uid} c={c} bg={bg} blur={blur} ad={pr(f, AD_START, AD_START + 14)} heart={heartFill} heartColor={heartColor} />
    </g>
  );
  const ring = f >= LIGHT_ON - 4 && f < LIGHT_ON + 10 ? <circle cx={adC[0]} cy={adC[1]} r={lerp(40, 140, pr(f, LIGHT_ON - 4, LIGHT_ON + 10))} fill="none" stroke={BLUE} strokeWidth={10 * (1 - pr(f, LIGHT_ON - 4, LIGHT_ON + 10))} /> : null;

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      <defs>
        {[0, 1].map((li) => lineClip('Q1', li, `Q1c${li}`))}
        {[0, 1, 2].map((li) => lineClip('A1', li, `A1c${li}`))}
        <clipPath id="wipe2"><circle cx={adC[0]} cy={adC[1]} r={wipe} /></clipPath>
        <filter id="tb" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation={textBlur} /></filter>
      </defs>
      {/* problema: fundo amarelo, tudo azul */}
      <rect width={1080} height={1920} fill={ACCENT} />
      <g filter={textBlur > 0.3 ? 'url(#tb)' : undefined}>
        <TextBlock id="Q1" f={f} start={[30, 36]} exit={96} colors={{B: BLUE, L: BLUE, O: BLUE}} />
      </g>
      {phone(BLUE, ACCENT, blurA, 'a')}
      {ring}
      {/* solução: o AD acende e espalha o azul; foto nítida, palavra-chave em amarelo */}
      {wipe > 0 ? (
        <g clipPath="url(#wipe2)">
          <rect width={1080} height={1920} fill={BLUE} />
          <TextBlock id="A1" f={f} start={[110, 116, 124]} colors={{L: LIGHT, O: ACCENT, B: LIGHT}} />
          {phone(LIGHT, BLUE, blurB, 'b', ACCENT)}
        </g>
      ) : null}
      {gestures}
      <RubberArrow x={ax} y={ay} rot={rot} scale={sc} rig={{stretch}} fill={arrowColor} />
    </svg>
  );
};

export const Scene2: React.FC<{blur?: boolean}> = ({blur = true}) => (
  <AbsoluteFill style={{backgroundColor: ACCENT}}>
    {blur ? (
      <CameraMotionBlur shutterAngle={180} samples={8}>
        <Scene />
      </CameraMotionBlur>
    ) : (
      <Scene />
    )}
  </AbsoluteFill>
);
