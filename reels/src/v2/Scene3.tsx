import React from 'react';
import {AbsoluteFill, useCurrentFrame, Easing} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {warpFrame, Seg} from './warp';
import {BLUE, LIGHT, ACCENT, T2, RubberArrow, STAIRS3} from './kit';
import {S2_ARROW_END} from './Scene2';

// ============ CENA 3: AUDIÇÃO ============
const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
const expoIn = Easing.bezier(0.7, 0, 0.84, 0);
const expoIO = Easing.bezier(0.87, 0, 0.13, 1);
const cl = (v: number) => Math.min(1, Math.max(0, v));
const pr = (f: number, a: number, b: number, e: (t: number) => number = expoOut) => e(cl((f - a) / (b - a)));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const BEAT = 12; // batida da trilha (0,4 s)
const beat = (f: number) => Math.exp(-(f % BEAT) / 3.5);

// diagramação: uma palavra por linha, alinhadas à esquerda; CONVERSA? num bloco azul
const PL = T2.F2.lines[4];
const PX1 = PL.bb[0] - 26;
const PX2 = PL.bb[2] + 26;
const PY1 = PL.y - PL.letters[0].size * 0.88;
const PY2 = PL.y + PL.letters[0].size * 0.2;
const PCX = (PX1 + PX2) / 2;
const PCY = (PY1 + PY2) / 2;

const WAVE_Y = 1390;
const OBJ_IN = 32; // bloco entra
const CLICK3 = 64; // a seta clica em CONVERSA?
const DROP = 67; // o bloco cai
const G = 6; // gravidade (px/frame²)
const CONTACT = DROP + Math.sqrt((2 * (WAVE_Y - PY2)) / G); // bloco encosta na onda e o som é cortado
const CUT = Math.round(CONTACT);
const SILENCE_END = CUT + 36; // 1,2 segundo de silêncio absoluto
const BAND = SILENCE_END; // a onda volta de baixo como faixa azul e toma a tela
const BARS = BAND + 18;
// transição para a cena 4: legendas voltam a ser barras, empilham como degraus e o claro sobe de baixo
const FOLD = BAND + 82; // frase completa fica ~1,3 s em tela, com pulso nas palavras-chave
const STACK = FOLD + 12;
const RISE = FOLD + 26;
const TREADS: [number, number, number][] = [
  [STAIRS3[4][0], STAIRS3[5][0], STAIRS3[4][1]], // linha de cima > degrau do topo
  [STAIRS3[2][0], STAIRS3[3][0], STAIRS3[2][1]], // linha do meio > primeiro degrau
  [STAIRS3[0][0], STAIRS3[1][0], STAIRS3[0][1]], // linha de baixo > chão
];
export const SCENE3_LEN = RISE + 34;

// queda do bloco depois do clique
const dropY = (f: number) => (f < DROP ? 0 : 0.5 * G * (f - DROP) * (f - DROP));
const dropX = (f: number) => (f < DROP ? 0 : 3 * (f - DROP));
const dropR = (f: number) => (f < DROP ? 0 : 1.6 * Math.pow(f - DROP, 1.25));

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

// onda sonora: viva na batida; quando o bloco cai sobre ela, é arrastada para fora da tela
const wavePath = (f: number) => {
  const N = 180;
  let A = (50 + 70 * beat(f)) * pr(f, 2, 14);
  if (f >= CUT) A *= Math.exp(-(f - CUT) / 3);
  const pull = Math.max(0, PY2 + dropY(f) - WAVE_Y);
  const px = PCX + dropX(f);
  const sigma = lerp(160, 2600, pr(f, CUT, CUT + 12, expoIn));
  const pts: string[] = [];
  for (let k = 0; k < N; k++) {
    const u = k / (N - 1);
    const x = 80 + 920 * u;
    const env = Math.pow(Math.sin(Math.PI * u), 1.3);
    const y = WAVE_Y + A * env * Math.sin(u * Math.PI * 7 - f * 0.45) + pull * Math.exp(-Math.pow((x - px) / sigma, 2));
    pts.push(`${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join('');
};

const Scene: React.FC<{segs?: Seg[]}> = ({segs = []}) => {
  const f = warpFrame(useCurrentFrame(), segs);
  const bandTop = lerp(1960, -40, pr(f, BAND, BAND + 18, expoIO));
  const live = f < CUT ? beat(f) : 0;

  // ---- palavras: uma por linha, entrando na batida com impacto; depois ficam paradas ----
  const ENTRY = [6, 12, 18, 24];
  const words: React.ReactNode[] = [];
  T2.F2.lines.slice(0, 4).forEach((ln, li) => {
    const st = ENTRY[li];
    if (f < st) return;
    const cx = (ln.bb[0] + ln.bb[2]) / 2;
    const cy = (ln.bb[1] + ln.bb[3]) / 2;
    const p = pr(f, st, st + 9, expoOut);
    const land = 0; // sem vibração no encaixe
    const sc0 = lerp(2.1, 1, p);
    const rot0 = lerp(li % 2 === 0 ? 10 : -10, 0, p);
    words.push(
      <g key={li} transform={`translate(${cx} ${cy}) rotate(${rot0}) scale(${sc0 * (1 + 0.06 * land)} ${sc0 * (1 - 0.1 * land)}) translate(${-cx} ${-cy})`}>
        {ln.letters.map((l, i) => <path key={i} d={l.d} fill={BLUE} />)}
      </g>,
    );
  });

  // ---- objeto único: bloco azul + CONVERSA? (entra, dança com o som, é clicado e cai) ----
  let pill: React.ReactNode = null;
  if (f >= OBJ_IN && dropY(f) < 1300) {
    const p = pr(f, OBJ_IN, OBJ_IN + 12, expoOut);
    const over = 0;
    const inS = lerp(0.2, 1, p) + over;
    const inR = lerp(-16, 0, p);
    const dancing = f >= OBJ_IN + 12 && f < CLICK3;
    const pulse = 1 + (dancing ? 0.06 * live : 0); // só uma pulsação suave no ritmo
    const sway = 0; // sem balanço
    const hop = 0; // sem saltos
    // clique: amassa
    const click = Math.sin(Math.PI * pr(f, CLICK3, CLICK3 + 5, expoIO));
    pill = (
      <g transform={`translate(${PCX + dropX(f)} ${PCY + hop + dropY(f)}) rotate(${inR + sway + dropR(f)}) scale(${inS * pulse * (1 + 0.06 * click)} ${inS * pulse * (1 - 0.14 * click)}) translate(${-PCX} ${-PCY})`}>
        <rect x={PX1} y={PY1} width={PX2 - PX1} height={PY2 - PY1} rx={(PY2 - PY1) / 2} fill={BLUE} />
        {PL.letters.map((l, i) => <path key={i} d={l.d} fill={ACCENT} />)}
      </g>
    );
  }

  // ---- sinal de sem som: surge grande quando a onda é levada ----
  const speaker =
    f >= CUT + 9 ? (
      <g transform={`translate(520 1300) scale(${2.3 * (1 + 0.12 * Math.sin(Math.PI * pr(f, CUT + 17, CUT + 25, expoIO)))})`}>
        <Draw t={(f - CUT - 9) / 9} color={BLUE} w={11} d="M-64 -22 L-34 -22 L0 -52 L0 52 L-34 22 L-64 22 Z" />
        <Draw t={(f - CUT - 14) / 5} color={BLUE} w={11} d="M28 -26 L78 24" />
        <Draw t={(f - CUT - 17) / 5} color={BLUE} w={11} d="M78 -26 L28 24" />
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
        // LEGENDA e LIBRAS dão um pulso de destaque, uma depois da outra
        let kw = '';
        if (l.color === 'O') {
          const ws = ln.letters.filter((x) => x.color === 'O');
          const wx = (ws[0].bb[0] + ws[ws.length - 1].bb[2]) / 2;
          const k = 1 + 0.12 * Math.sin(Math.PI * pr(f, BAND + 48 + li * 8, BAND + 60 + li * 8, expoIO));
          kw = ` translate(${wx} ${y}) scale(${k}) translate(${-wx} ${-y})`;
        }
        out.push(<path key={`s${li}-${i}`} d={l.d} fill={l.color === 'O' ? colO : colL} transform={`translate(0 ${y}) scale(1 ${s2}) translate(0 ${-y})${kw}`} />);
      });
    });
    return out;
  };
  // espelhos e chão da escada se desenham quando as barras assentam
  const stairExtras = (col: string) =>
    f >= STACK + 12 ? (
      <g>
        <Draw t={(f - STACK - 12) / 8} color={col} w={11} d={`M${STAIRS3[1][0]} ${STAIRS3[1][1]} L${STAIRS3[2][0]} ${STAIRS3[2][1]}`} />
        <Draw t={(f - STACK - 15) / 8} color={col} w={11} d={`M${STAIRS3[3][0]} ${STAIRS3[3][1]} L${STAIRS3[4][0]} ${STAIRS3[4][1]}`} />
      </g>
    ) : null;
  const riseTop = lerp(1960, -40, pr(f, RISE, RISE + 20, expoIO));

  // ---- SETA ----
  const tipOff = (r: number, k: number): [number, number] => {
    const an = (r * Math.PI) / 180;
    const d0: [number, number] = [-0.336 * 64.8 * k, -0.942 * 64.8 * k];
    return [d0[0] * Math.cos(an) - d0[1] * Math.sin(an), d0[0] * Math.sin(an) + d0[1] * Math.cos(an)];
  };
  const IDLE: [number, number] = [840, 640];
  let ax = lerp(S2_ARROW_END.x, IDLE[0], pr(f, 0, 16, expoIO));
  let ay = lerp(S2_ARROW_END.y, IDLE[1], pr(f, 0, 16, expoIO)) - 120 * Math.sin(Math.PI * pr(f, 0, 16, expoIO));
  let rot = -24;
  let stretch = 1;
  let sc = 1.5;
  // olha cada palavra que chega
  [6, 12, 18, 24].forEach((st) => {
    if (f >= st && f < st + 10) rot += -10 * Math.sin(Math.PI * pr(f, st, st + 10, expoIO));
  });
  // vai até CONVERSA? e clica, com a ponta para baixo
  const RCLK = -118;
  const tip = tipOff(RCLK, 1.5);
  const clickPos: [number, number] = [PX2 - 110 - tip[0], PY1 + 14 - tip[1]];
  if (f >= 46) {
    const t = pr(f, 46, 60, expoIO);
    ax = lerp(IDLE[0], clickPos[0], t);
    ay = lerp(IDLE[1], clickPos[1], t) - 90 * Math.sin(Math.PI * t);
    rot = lerp(-24, RCLK, t);
    const ant = pr(f, 58, 62, expoOut) * (1 - pr(f, 62, CLICK3, expoIn));
    ay -= 24 * ant;
    stretch = 1 + 0.06 * ant - 0.14 * Math.sin(Math.PI * pr(f, CLICK3, CLICK3 + 6, expoIO));
  }
  // vê o bloco cair levando a onda: recua e acompanha a queda com a ponta
  if (f >= CLICK3 + 4) {
    const t = pr(f, CLICK3 + 4, CLICK3 + 16, expoIO);
    ax = lerp(clickPos[0], 860, t);
    ay = lerp(clickPos[1], 940, t);
    rot = lerp(RCLK, -160, t);
  }
  // silêncio: murcha e fica imóvel
  if (f >= CUT + 6 && f < BAND + 10) {
    const d = pr(f, CUT + 6, CUT + 16, expoOut);
    ay = lerp(940, 980, d);
    rot = lerp(-160, -190, d);
    stretch = lerp(1, 0.86, d);
    sc = lerp(1.5, 1.3, d);
  }
  if (f >= BAND + 10) {
    // a mensagem chega: levanta, pula e gira de alegria
    const t = pr(f, BAND + 10, BAND + 34, expoIO);
    ax = lerp(860, 860, t);
    ay = lerp(980, 1300, t) - 200 * Math.sin(Math.PI * t);
    rot = lerp(-190, -24 - 360, t);
    stretch = lerp(0.86, 1, t) + 0.12 * Math.sin(Math.PI * t);
    sc = lerp(1.3, 1.5, t);
  }
  if (f >= FOLD + 4) {
    const t = pr(f, FOLD + 4, FOLD + 28, expoIO);
    const fx = 860;
    const fy = 1300;
    ax = lerp(fx, 180, t);
    ay = lerp(fy, 1338, t) - 220 * Math.sin(Math.PI * t);
    rot = lerp(-384, -370, t) - 360 * pr(f, FOLD + 6, FOLD + 26, expoIO);
    stretch = f >= FOLD + 28 && f < FOLD + 36 ? 1 - 0.12 * Math.sin(Math.PI * pr(f, FOLD + 28, FOLD + 36, expoIO)) : 1 + 0.1 * Math.sin(Math.PI * t);
    sc = lerp(1.5, 1.12, t); // chega no tamanho da cena 4
  }
  const inBand = f >= BAND && ay > bandTop;
  const arrowColor = f >= RISE && ay > riseTop ? BLUE : inBand ? ACCENT : BLUE;

  const gestures: React.ReactNode[] = [];
  if (f >= BAND + 30 && f < BAND + 48) {
    [-1, 0, 1].forEach((k) =>
      gestures.push(<Gesture key={`j${k}`} t={(f - BAND - 30 - Math.abs(k)) / 16} color={ACCENT} d={`M${ax - 60 + k * 60} ${ay - 150} Q${ax - 50 + k * 80} ${ay - 210} ${ax - 60 + k * 110} ${ay - 270}`} />),
    );
  }

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      <defs>
        <clipPath id="rise"><rect x={-20} y={riseTop} width={1120} height={2000} /></clipPath>
      </defs>
      <rect width={1080} height={1920} fill={LIGHT} />
      {words}
      {speaker}
      {/* a onda: viva na batida; arrastada para fora da tela pelo bloco que cai */}
      {f >= 2 && f < CUT + 14 ? (
        <path d={wavePath(f)} fill="none" stroke={BLUE} strokeWidth={11} strokeLinecap="round" pathLength={1} strokeDasharray={`${f < 16 ? expoOut(cl((f - 2) / 14)) : 1} 2`} />
      ) : null}
      {pill}
      {/* a onda volta de baixo como faixa azul e toma a tela */}
      {f >= BAND ? <rect x={-20} y={bandTop} width={1120} height={2100} fill={BLUE} /> : null}
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

export const Scene3: React.FC<{blur?: boolean; segs?: Seg[]}> = ({blur = true, segs = []}) => (
  <AbsoluteFill style={{backgroundColor: LIGHT}}>
    {blur ? (
      <CameraMotionBlur shutterAngle={180} samples={8}>
        <Scene segs={segs} />
      </CameraMotionBlur>
    ) : (
      <Scene segs={segs} />
    )}
  </AbsoluteFill>
);
