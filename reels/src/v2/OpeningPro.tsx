import React from 'react';
import {AbsoluteFill, useCurrentFrame, Easing} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {BLUE, LIGHT, ACCENT, T2, RubberArrow, SocialPost, PHONE} from './kit';

// ============ SISTEMA DE MOVIMENTO ============
// Uma família de curvas (exponencial) e grid de tempo de 12 frames.
const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
const expoIn = Easing.bezier(0.7, 0, 0.84, 0);
const expoIO = Easing.bezier(0.87, 0, 0.13, 1);
const cl = (v: number) => Math.min(1, Math.max(0, v));
const pr = (f: number, a: number, b: number, e: (t: number) => number = expoOut) => e(cl((f - a) / (b - a)));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ============ DIAGRAMAÇÃO: bloco justificado ============
const LINES = T2.LA.lines;
const DOT = LINES[3].letters[LINES[3].letters.length - 1]; // ponto final de "percepção."
const DOT_C: [number, number] = [(DOT.bb[0] + DOT.bb[2]) / 2, (DOT.bb[1] + DOT.bb[3]) / 2];

// ponto final com física de bola: cai, amassa no impacto, quica e assenta
const IMPACT = 60;
const dotMotion = (f: number) => {
  const H = 620;
  if (f < 50) return {dy: -H, sx: 1, sy: 1, show: false};
  if (f < 60) {
    const t = (f - 50) / 10;
    return {dy: -H * (1 - t * t), sx: 0.9, sy: 1.15, show: true};
  }
  if (f < 63) return {dy: 0, sx: 1.35, sy: 0.65, show: true};
  if (f < 73) {
    const t = (f - 63) / 10;
    return {dy: -160 * 4 * t * (1 - t), sx: 0.95, sy: 1.06, show: true};
  }
  if (f < 75) return {dy: 0, sx: 1.15, sy: 0.85, show: true};
  return {dy: 0, sx: 1, sy: 1, show: true};
};

type Look = {fg: string; key: string};
const LOOK_A: Look = {fg: LIGHT, key: ACCENT}; // fundo azul
const LOOK_B: Look = {fg: BLUE, key: BLUE}; // fundo amarelo (abre com "a sua")
const LOOK_C: Look = {fg: LIGHT, key: ACCENT}; // fundo azul de novo (espalhado pelo quique do ponto)
const BAND_Y = (T2.LA.lines[2].bb[1] + T2.LA.lines[2].bb[3]) / 2;

const clipFor = (li: number, k: string) => {
  const ln = LINES[li];
  const top = ln.bb[1] - 40;
  return (
    <clipPath id={k}>
      <rect x={-400} y={top} width={1880} height={ln.y + ln.letters[0].size * 0.32 - top} />
    </clipPath>
  );
};
const START = [2, 14, 28, 38];

const Block: React.FC<{f: number; look: Look; portal: number}> = ({f, look, portal}) => {
  const out: React.ReactNode[] = [];
  LINES.forEach((ln, li) => {
    ln.letters.forEach((l, i) => {
      if (l === DOT) return;
      const st = START[li] + (li % 2 === 0 ? l.word * 4 : i * 1.2);
      if (f < st) return;
      const p = pr(f, st, st + 14);
      out.push(
        <g key={`${li}-${i}`} clipPath={`url(#ln${li})`}>
          <path d={l.d} fill={li === 3 ? look.key : look.fg} transform={`translate(0 ${(1 - p) * l.size * 1.3})`} />
        </g>,
      );
    });
  });
  const m = dotMotion(f);
  if (m.show) {
    const base = DOT.bb[3];
    const tr =
      portal > 0
        ? `translate(${DOT_C[0]} ${DOT_C[1]}) scale(${lerp(1, 70, portal)}) translate(${-DOT_C[0]} ${-DOT_C[1]})`
        : `translate(${DOT_C[0]} ${base + m.dy}) scale(${m.sx} ${m.sy}) translate(${-DOT_C[0]} ${-base})`;
    out.push(<path key="dot" d={DOT.d} fill={look.key} transform={tr} />);
  }
  return <g>{out}</g>;
};

// Traços de gesto: nascem curvos, viajam e se recolhem
const Gesture: React.FC<{d: string; t: number; color: string; w?: number}> = ({d, t, color, w = 10}) => {
  if (t <= 0 || t >= 1) return null;
  const head = expoOut(cl(t / 0.65));
  const tail = expoIn(cl((t - 0.25) / 0.75));
  return <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={w * (1 - 0.5 * tail)} strokeLinecap="round" strokeDasharray={`${Math.max(0.001, head - tail)} 2`} strokeDashoffset={-tail} />;
};

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const band = 1100 * pr(f, 28, 44, expoIO); // faixa que se abre a partir de "a sua"
  const wipe = 2400 * pr(f, IMPACT, IMPACT + 18, expoIO); // círculo a partir do ponto
  const portal = pr(f, 100, 114, expoIn);
  const post = f >= 114;

  // ---- SETA: acima do bloco, olhando a frase; acompanha a queda do ponto e se assusta ----
  const HX = 860;
  const HY = 420;
  let ax = HX;
  let ay = HY;
  let rot = -150; // ponta voltada para baixo, olhando o texto
  let stretch = 1;
  let sc = 1.6;
  if (f < 34) {
    const t = pr(f, 20, 34);
    ax = lerp(1260, HX, t);
    ay = lerp(300, HY, t) - 80 * Math.sin(Math.PI * t);
    rot = lerp(-200, -150, t);
  }
  // acompanha o ponto caindo: inclina a ponta na direção dele
  if (f >= 48 && f < IMPACT) rot = -150 + 25 * pr(f, 48, IMPACT, expoIn);
  // susto com o impacto: pulo curto, estica e assenta
  if (f >= IMPACT && f < 82) {
    const t = pr(f, IMPACT, IMPACT + 7, expoOut) - pr(f, IMPACT + 7, 80, expoIO);
    ay = HY - 60 * t;
    stretch = 1 + 0.12 * t - 0.07 * Math.sin(Math.PI * pr(f, 76, 82, expoIO));
    rot = lerp(-125, -150, pr(f, IMPACT, 80, expoIO));
  }
  const inC = Math.hypot(ax - DOT_C[0], ay - DOT_C[1]) < wipe;
  const inB = !inC && Math.abs(ay - BAND_Y) < band;
  if (post) {
    const t = pr(f, 118, 140);
    ax = lerp(900, 330, t);
    ay = lerp(1700, 1290, t) - 120 * Math.sin(Math.PI * t);
    rot = lerp(-60, -12, t);
    sc = 1.7;
    stretch = f >= 140 && f < 150 ? 1 - 0.07 * Math.sin(Math.PI * pr(f, 140, 150, expoIO)) : 1;
  }

  const gestures: React.ReactNode[] = [];
  if (f >= IMPACT && f < IMPACT + 16) {
    [-1, 0, 1].forEach((k) =>
      gestures.push(<Gesture key={`g${k}`} t={(f - IMPACT - Math.abs(k)) / 14} color={inC ? ACCENT : inB ? BLUE : ACCENT} d={`M${ax - 70 + k * 50} ${ay - 120} Q${ax - 60 + k * 60} ${ay - 180} ${ax - 70 + k * 80} ${ay - 240}`} />),
    );
    // o impacto do ponto também respira
    [-1, 1].forEach((k) =>
      gestures.push(<Gesture key={`d${k}`} t={(f - IMPACT) / 12} color={ACCENT} w={9} d={`M${DOT_C[0] + k * 34} ${DOT.bb[3] - 10} Q${DOT_C[0] + k * 70} ${DOT.bb[3] - 40} ${DOT_C[0] + k * 96} ${DOT.bb[3] - 90}`} />),
    );
  }
  if (post && f >= 140 && f < 156) {
    [0, 1].forEach((k) => gestures.push(<Gesture key={`p${k}`} t={(f - 140 - k * 2) / 14} color={BLUE} w={9} d={`M${ax + 90 + k * 40} ${ay - 120} Q${ax + 130 + k * 40} ${ay - 170} ${ax + 120 + k * 50} ${ay - 230}`} />));
  }

  const phoneIn = pr(f, 114, 138);
  const phoneScale = lerp(1.3, 1, phoneIn) + (f > 138 ? (f - 138) * 0.0012 : 0);
  const roll = lerp(-260, 0, pr(f, 124, 152));

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      <defs>
        {LINES.map((_, i) => <React.Fragment key={i}>{clipFor(i, `ln${i}`)}</React.Fragment>)}
        <clipPath id="band"><rect x={-10} y={BAND_Y - band} width={1100} height={band * 2} /></clipPath>
        <clipPath id="wipe"><circle cx={DOT_C[0]} cy={DOT_C[1]} r={wipe} /></clipPath>
      </defs>
      {!post ? (
        <>
          <rect width={1080} height={1920} fill={BLUE} />
          <Block f={f} look={LOOK_A} portal={0} />
          {band > 0 ? (
            <g clipPath="url(#band)">
              <rect width={1080} height={1920} fill={ACCENT} />
              <Block f={f} look={LOOK_B} portal={0} />
            </g>
          ) : null}
          {wipe > 0 ? (
            <g clipPath="url(#wipe)">
              <rect width={1080} height={1920} fill={BLUE} />
              <Block f={f} look={LOOK_C} portal={portal} />
            </g>
          ) : null}
        </>
      ) : (
        <>
          <rect width={1080} height={1920} fill={ACCENT} />
          <g transform={`translate(540 ${PHONE.y + PHONE.h / 2}) scale(${phoneScale}) translate(-540 ${-(PHONE.y + PHONE.h / 2)})`}>
            <SocialPost c={BLUE} bg={ACCENT} roll={roll} />
          </g>
        </>
      )}
      {gestures}
      {f >= 20 && (portal < 0.6 || post) ? <RubberArrow x={ax} y={ay} rot={rot} scale={sc} rig={{stretch}} fill={post ? BLUE : inB ? BLUE : ACCENT} /> : null}
    </svg>
  );
};

export const OpeningPro: React.FC<{blur?: boolean}> = ({blur = true}) => (
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
