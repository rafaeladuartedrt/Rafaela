import React from 'react';
import {AbsoluteFill, useCurrentFrame, Easing} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {BLUE, LIGHT, ACCENT, T2, RubberArrow} from './kit';

// ============ CENA 3: AUDIÇÃO ============
const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
const expoIn = Easing.bezier(0.7, 0, 0.84, 0);
const expoIO = Easing.bezier(0.87, 0, 0.13, 1);
const cl = (v: number) => Math.min(1, Math.max(0, v));
const pr = (f: number, a: number, b: number, e: (t: number) => number = expoOut) => e(cl((f - a) / (b - a)));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const BEAT = 12; // batida da trilha (0,4 s)
const beat = (f: number) => Math.exp(-(f % BEAT) / 3.5);
const CUT = 64; // o som é cortado
const SILENCE_END = CUT + 62; // 2 segundos de silêncio absoluto
const BAND = SILENCE_END; // a linha engrossa e varre a tela de azul
const BARS = BAND + 18;
const WAVE_Y = 1060;

const Gesture: React.FC<{d: string; t: number; color: string; w?: number}> = ({d, t, color, w = 10}) => {
  if (t <= 0 || t >= 1) return null;
  const head = expoOut(cl(t / 0.65));
  const tail = expoIn(cl((t - 0.3) / 0.7));
  return <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={w * (1 - 0.5 * tail)} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${Math.max(0.001, head - tail)} 2`} strokeDashoffset={-tail} />;
};
// traço que se desenha e permanece
const Draw: React.FC<{d: string; t: number; color: string; w?: number}> = ({d, t, color, w = 10}) =>
  t <= 0 ? null : <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${Math.max(0.001, expoOut(cl(t)))} 2`} />;

const lineClip = (id: string, li: number, k: string) => {
  const ln = T2[id].lines[li];
  const top = ln.bb[1] - 40;
  return (
    <clipPath id={k} key={k}>
      <rect x={-400} y={top} width={1880} height={ln.y + ln.letters[0].size * 0.32 - top} />
    </clipPath>
  );
};

// onda sonora: viva na batida, achata quando o som é cortado
const wavePath = (f: number) => {
  const N = 160;
  let A: number;
  if (f < CUT) A = (50 + 70 * beat(f)) * pr(f, 2, 14);
  else {
    const t = f - CUT;
    A = 120 * Math.exp(-t / 2.2) + 10 * Math.exp(-t / 4) * Math.sin(t * 2.3);
  }
  const pts: string[] = [];
  for (let k = 0; k < N; k++) {
    const u = k / (N - 1);
    const x = 80 + 920 * u;
    const env = Math.pow(Math.sin(Math.PI * u), 1.3);
    const y = WAVE_Y + A * env * Math.sin(u * Math.PI * 7 - f * 0.45);
    pts.push(`${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join('');
};

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const band = 2300 * pr(f, BAND, BAND + 18, expoIO);

  // ---- problema: "Ficou fora dessa conversa?" pulsando com a batida ----
  const live = f < CUT ? beat(f) : 0;
  const words: React.ReactNode[] = [];
  T2.F1.lines.forEach((ln, li) => {
    const cy = (ln.bb[1] + ln.bb[3]) / 2;
    const ls = 1 + 0.035 * live;
    ln.letters.forEach((l, i) => {
      const st = (li === 0 ? 8 : 14) + i * 0.7;
      if (f < st) return;
      const p = pr(f, st, st + 14);
      const isConversa = li === 1 && l.word === 1;
      let tr = `translate(0 ${(1 - p) * l.size * 1.3}) translate(540 ${cy}) scale(${ls}) translate(-540 ${-cy})`;
      if (isConversa) {
        const wl = ln.letters.filter((x) => x.word === 1);
        const wx = (wl[0].bb[0] + wl[wl.length - 1].bb[2]) / 2;
        const extra = 1 + 0.05 * live;
        // achata até virar uma linha e depois se recolhe até sumir
        const flat = lerp(1, 0.07, pr(f, CUT, CUT + 7, expoOut));
        const gone = 1 - pr(f, CUT + 9, CUT + 22, expoIn);
        if (gone <= 0.001) return;
        tr += ` translate(${wx} ${ln.y - l.size * 0.25}) scale(${extra * gone} ${extra * flat}) translate(${-wx} ${-(ln.y - l.size * 0.25)})`;
      }
      words.push(
        <g key={`${li}-${i}`} clipPath={`url(#F1c${li})`}>
          <path d={l.d} fill={BLUE} transform={tr} />
        </g>,
      );
    });
  });

  // ---- alto-falante cortado ----
  const spkOut = 1 - pr(f, CUT + 6, CUT + 14, expoIn);
  const speaker =
    f >= 54 && spkOut > 0.001 ? (
      <g transform={`translate(540 860) scale(${1.25 * spkOut})`}>
        <Draw t={(f - 54) / 8} color={BLUE} w={11} d="M-64 -22 L-34 -22 L0 -52 L0 52 L-34 22 L-64 22 Z" />
        <Draw t={(f - 59) / 5} color={BLUE} w={11} d="M28 -26 L78 24" />
        <Draw t={(f - 62) / 4} color={BLUE} w={11} d="M78 -26 L28 24" />
      </g>
    ) : null;

  // ---- solução: barras de legenda que se desdobram em texto ----
  const bars: React.ReactNode[] = [];
  const sol: React.ReactNode[] = [];
  if (f >= BARS) {
    T2.S3.lines.forEach((ln, li) => {
      const y = (ln.bb[1] + ln.bb[3]) / 2;
      const x1 = ln.bb[0];
      const x2 = ln.bb[2];
      const grow = pr(f, BARS + li * 3, BARS + li * 3 + 10, expoOut);
      const wx = lerp(x1 - 30, x2 + 30, pr(f, BARS + 10 + li * 3, BARS + 26 + li * 3, expoIO));
      const cx = (x1 + x2) / 2;
      const bx1 = Math.max(lerp(cx, x1, grow), wx);
      const bx2 = lerp(cx, x2, grow);
      if (bx2 > bx1) bars.push(<path key={`b${li}`} d={`M${bx1} ${y} L${bx2} ${y}`} stroke={LIGHT} strokeWidth={34} strokeLinecap="round" />);
      ln.letters.forEach((l, i) => {
        if (wx < l.bb[0]) return;
        const s = 0.18 + 0.82 * expoOut(cl((wx - l.bb[0]) / 90));
        sol.push(<path key={`s${li}-${i}`} d={l.d} fill={l.color === 'O' ? ACCENT : LIGHT} transform={`translate(0 ${y}) scale(1 ${s}) translate(0 ${-y})`} />);
      });
    });
  }

  // ---- SETA ----
  let ax = lerp(930, 820, pr(f, 0, 14, expoIO));
  let ay = lerp(1440, 1300, pr(f, 0, 14, expoIO));
  let rot = -24;
  let stretch = 1;
  let sc = 1.5;
  if (f >= 14 && f < CUT) {
    // dança na batida: amassa no tempo forte e sobe entre as batidas
    const b = beat(f);
    ay = 1300 - 26 * (1 - b);
    stretch = 1 - 0.1 * b;
    rot = -24 + 8 * Math.sin((f / BEAT) * Math.PI);
  }
  if (f >= CUT && f < BAND + 10) {
    // o som some: murcha e fica imóvel no silêncio
    const d = pr(f, CUT, CUT + 10, expoOut);
    ay = lerp(1300, 1330, d);
    rot = lerp(-24, -6, d);
    stretch = lerp(1, 0.86, d);
    sc = lerp(1.5, 1.3, d);
  }
  if (f >= BAND + 10) {
    // a mensagem chega: levanta, pula e gira de alegria
    const t = pr(f, BAND + 10, BAND + 34, expoIO);
    ax = lerp(820, 860, t);
    ay = lerp(1330, 1300, t) - 160 * Math.sin(Math.PI * t);
    rot = lerp(-6, -24, t) - 360 * pr(f, BAND + 12, BAND + 30, expoIO);
    stretch = lerp(0.86, 1, t) + 0.12 * Math.sin(Math.PI * t);
    sc = lerp(1.3, 1.5, t);
  }
  const inBand = Math.abs(ay - WAVE_Y) < band / 2;
  const arrowColor = inBand ? ACCENT : BLUE;

  const gestures: React.ReactNode[] = [];
  if (f >= BAND + 30 && f < BAND + 48) {
    [-1, 0, 1].forEach((k) =>
      gestures.push(<Gesture key={`j${k}`} t={(f - BAND - 30 - Math.abs(k)) / 16} color={ACCENT} d={`M${ax - 60 + k * 60} ${ay - 150} Q${ax - 50 + k * 80} ${ay - 210} ${ax - 60 + k * 110} ${ay - 270}`} />),
    );
  }

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      <defs>{[0, 1].map((li) => lineClip('F1', li, `F1c${li}`))}</defs>
      <rect width={1080} height={1920} fill={LIGHT} />
      {words}
      {speaker}
      {/* a onda: viva, depois reta; no fim engrossa e varre a tela */}
      {f >= 2 && band <= 11 ? (
        <path d={wavePath(Math.min(f, BAND))} fill="none" stroke={BLUE} strokeWidth={11} strokeLinecap="round" pathLength={1} strokeDasharray={`${f < 16 ? expoOut(cl((f - 2) / 14)) : 1} 2`} />
      ) : null}
      {band > 11 ? <rect x={-20} y={WAVE_Y - band / 2} width={1120} height={band} fill={BLUE} /> : null}
      {bars}
      {sol}
      {gestures}
      <RubberArrow x={ax} y={ay} rot={rot} scale={sc} rig={{stretch}} fill={arrowColor} />
    </svg>
  );
};

export const Scene3: React.FC<{blur?: boolean}> = ({blur = true}) => (
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
