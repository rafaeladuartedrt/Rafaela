import React from 'react';
import {AbsoluteFill, useCurrentFrame, Easing} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {BLUE, LIGHT, ACCENT, T2, RubberArrow, STAIRS3} from './kit';

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
// transição para a cena 4: legendas voltam a ser barras, empilham como degraus e o claro sobe de baixo
const FOLD = 196;
const STACK = 208;
const RISE = 222;
const TREADS: [number, number, number][] = [
  [STAIRS3[6][0], STAIRS3[7][0], STAIRS3[6][1]], // linha de cima > degrau mais alto
  [STAIRS3[4][0], STAIRS3[5][0], STAIRS3[4][1]],
  [STAIRS3[2][0], STAIRS3[3][0], STAIRS3[2][1]],
];

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

  // ---- problema: "Ficou de fora dessa conversa?" pulsando com a batida ----
  const live = f < CUT ? beat(f) : 0;
  // ---- bloco sólido de "conversa?" ----
  let pill: React.ReactNode = null;
  let pillClip: React.ReactNode = null;
  {
    const ln = T2.F1.lines[1];
    const wl = ln.letters.filter((x) => x.word === 1);
    const st = 14 + ln.letters.indexOf(wl[0]) * 0.7;
    if (f >= st) {
      const x1 = wl[0].bb[0] - 24;
      const x2 = wl[wl.length - 1].bb[2] + 24;
      const y1 = ln.y - wl[0].size * 0.78;
      const y2 = ln.y + wl[0].size * 0.3;
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const inP = pr(f, st - 2, st + 10, expoOut);
      const extra = 1 + 0.05 * live;
      const flat = lerp(1, 11 / (y2 - y1), pr(f, CUT, CUT + 7, expoOut));
      const gone = 1 - pr(f, CUT + 9, CUT + 22, expoIn);
      if (gone > 0.001) {
        const h = (y2 - y1) * flat * extra * inP;
        const w = (x2 - x1) * extra * gone * lerp(0.4, 1, inP);
        pill = <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={Math.min(h, w) / 2} fill={BLUE} />;
        pillClip = (
          <clipPath id="pillc">
            <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={Math.min(h, w) / 2} />
          </clipPath>
        );
      }
    }
  }

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
        <g key={`${li}-${i}`} clipPath={isConversa ? (f < CUT ? 'url(#pillc)' : undefined) : `url(#F1c${li})`}>
          <path d={l.d} fill={isConversa ? ACCENT : BLUE} transform={tr} />
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

  // ---- solução: barras de legenda que se desdobram em texto (e depois se dobram e viram degraus) ----
  const stackT = pr(f, STACK, STACK + 18, expoIO);
  const barsFor = (col: string): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    if (f < BARS) return out;
    T2.S3.lines.forEach((ln, li) => {
      const y = (ln.bb[1] + ln.bb[3]) / 2;
      const x1 = ln.bb[0];
      const x2 = ln.bb[2];
      const grow = pr(f, BARS + li * 3, BARS + li * 3 + 10, expoOut);
      // cabeça que transforma barra em letra (ida) e letra em barra (volta)
      const wIn = lerp(x1 - 30, x2 + 30, pr(f, BARS + 10 + li * 3, BARS + 26 + li * 3, expoIO));
      const wOut = lerp(x2 + 30, x1 - 30, pr(f, FOLD + li * 2, FOLD + 12 + li * 2, expoIO));
      const folding = f >= FOLD;
      const cx = (x1 + x2) / 2;
      let bx1 = folding ? Math.max(x1, wOut) : Math.max(lerp(cx, x1, grow), wIn);
      let bx2 = folding ? x2 : lerp(cx, x2, grow);
      let by = y;
      let bw = 34;
      if (f >= STACK) {
        const [tx1, tx2, ty] = TREADS[li];
        bx1 = lerp(x1, tx1, stackT);
        bx2 = lerp(x2, tx2, stackT);
        by = lerp(y, ty, stackT) - 60 * Math.sin(Math.PI * stackT) * (1 + li * 0.3);
        bw = lerp(34, 11, stackT);
      }
      if (bx2 > bx1) out.push(<path key={`b${li}`} d={`M${bx1} ${by} L${bx2} ${by}`} stroke={col} strokeWidth={bw} strokeLinecap="round" />);
    });
    return out;
  };
  const lettersFor = (colL: string, colO: string): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    if (f < BARS || f >= STACK) return out;
    T2.S3.lines.forEach((ln, li) => {
      const y = (ln.bb[1] + ln.bb[3]) / 2;
      const wIn = lerp(ln.bb[0] - 30, ln.bb[2] + 30, pr(f, BARS + 10 + li * 3, BARS + 26 + li * 3, expoIO));
      const wOut = lerp(ln.bb[2] + 30, ln.bb[0] - 30, pr(f, FOLD + li * 2, FOLD + 12 + li * 2, expoIO));
      ln.letters.forEach((l, i) => {
        let s2: number;
        if (f < FOLD) {
          if (wIn < l.bb[0]) return;
          s2 = 0.18 + 0.82 * expoOut(cl((wIn - l.bb[0]) / 90));
        } else {
          if (wOut < l.bb[0]) return;
          s2 = 0.18 + 0.82 * cl((wOut - l.bb[0]) / 90);
        }
        out.push(<path key={`s${li}-${i}`} d={l.d} fill={l.color === 'O' ? colO : colL} transform={`translate(0 ${y}) scale(1 ${s2}) translate(0 ${-y})`} />);
      });
    });
    return out;
  };
  // espelhos e chão da escada se desenham quando as barras assentam
  const stairExtras = (col: string) =>
    f >= STACK + 12 ? (
      <g>
        <Draw t={(f - STACK - 12) / 10} color={col} w={11} d={`M${STAIRS3[0][0]} ${STAIRS3[0][1]} L${STAIRS3[1][0]} ${STAIRS3[1][1]} L${STAIRS3[2][0]} ${STAIRS3[2][1]}`} />
        <Draw t={(f - STACK - 14) / 8} color={col} w={11} d={`M${STAIRS3[3][0]} ${STAIRS3[3][1]} L${STAIRS3[4][0]} ${STAIRS3[4][1]}`} />
        <Draw t={(f - STACK - 16) / 8} color={col} w={11} d={`M${STAIRS3[5][0]} ${STAIRS3[5][1]} L${STAIRS3[6][0]} ${STAIRS3[6][1]}`} />
      </g>
    ) : null;
  const riseTop = lerp(1960, -40, pr(f, RISE, RISE + 20, expoIO));

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
  if (f >= FOLD + 4) {
    const t = pr(f, FOLD + 4, FOLD + 28, expoIO);
    const fx = 860;
    const fy = 1300;
    ax = lerp(fx, 140, t);
    ay = lerp(fy, 1316, t) - 220 * Math.sin(Math.PI * t);
    rot = lerp(-24, -10, t) - 360 * pr(f, FOLD + 6, FOLD + 26, expoIO);
    stretch = f >= FOLD + 28 && f < FOLD + 36 ? 1 - 0.12 * Math.sin(Math.PI * pr(f, FOLD + 28, FOLD + 36, expoIO)) : 1 + 0.1 * Math.sin(Math.PI * t);
    sc = 1.5;
  }
  const inBand = Math.abs(ay - WAVE_Y) < band / 2;
  const arrowColor = ay > riseTop ? BLUE : inBand ? ACCENT : BLUE;

  const gestures: React.ReactNode[] = [];
  if (f >= BAND + 30 && f < BAND + 48) {
    [-1, 0, 1].forEach((k) =>
      gestures.push(<Gesture key={`j${k}`} t={(f - BAND - 30 - Math.abs(k)) / 16} color={ACCENT} d={`M${ax - 60 + k * 60} ${ay - 150} Q${ax - 50 + k * 80} ${ay - 210} ${ax - 60 + k * 110} ${ay - 270}`} />),
    );
  }

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      <defs>
        {[0, 1].map((li) => lineClip('F1', li, `F1c${li}`))}
        {pillClip}
        <clipPath id="rise"><rect x={-20} y={riseTop} width={1120} height={2000} /></clipPath>
      </defs>
      <rect width={1080} height={1920} fill={LIGHT} />
      {pill}
      {words}
      {speaker}
      {/* a onda: viva, depois reta; no fim engrossa e varre a tela */}
      {f >= 2 && band <= 11 ? (
        <path d={wavePath(Math.min(f, BAND))} fill="none" stroke={BLUE} strokeWidth={11} strokeLinecap="round" pathLength={1} strokeDasharray={`${f < 16 ? expoOut(cl((f - 2) / 14)) : 1} 2`} />
      ) : null}
      {band > 11 ? <rect x={-20} y={WAVE_Y - band / 2} width={1120} height={band} fill={BLUE} /> : null}
      {barsFor(LIGHT)}
      {lettersFor(LIGHT, ACCENT)}
      {stairExtras(LIGHT)}
      {f >= RISE ? (
        <g clipPath="url(#rise)">
          <rect width={1080} height={1920} fill={LIGHT} />
          {barsFor(BLUE)}
          {stairExtras(BLUE)}
        </g>
      ) : null}
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
