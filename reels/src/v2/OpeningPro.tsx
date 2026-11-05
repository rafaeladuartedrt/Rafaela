import React from 'react';
import {AbsoluteFill, useCurrentFrame, Easing} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {BLUE, LIGHT, ACCENT, T2, L2, RubberArrow, SocialPost, PHONE} from './kit';

// ============ SISTEMA DE MOVIMENTO ============
// Uma família de curvas só (exponencial). Grid de tempo: batida de 12 frames (0,4 s).
const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
const expoIn = Easing.bezier(0.7, 0, 0.84, 0);
const expoIO = Easing.bezier(0.87, 0, 0.13, 1);
const cl = (v: number) => Math.min(1, Math.max(0, v));
const pr = (f: number, a: number, b: number, e: (t: number) => number = expoOut) => e(cl((f - a) / (b - a)));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hs = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

// ============ TIPOGRAFIA ============
type Look = {bg: string; fg: string; key: string};
const LOOK_A: Look = {bg: BLUE, fg: LIGHT, key: LIGHT};
const LOOK_B: Look = {bg: ACCENT, fg: BLUE, key: BLUE};
const LOOK_C: Look = {bg: BLUE, fg: LIGHT, key: ACCENT};

const lineClip = (id: string, k: string) => {
  const ln = T2[id].lines[0];
  const top = ln.bb[1] - 40;
  return (
    <clipPath id={k}>
      <rect x={-400} y={top} width={1880} height={ln.y + ln.letters[0].size * 0.32 - top} />
    </clipPath>
  );
};

// Letra com transformação própria
const Glyph: React.FC<{l: L2; color: string; dx?: number; dy?: number; rot?: number; s?: number; ox?: number; oy?: number}> = ({l, color, dx = 0, dy = 0, rot = 0, s = 1, ox, oy}) => {
  const cx = ox ?? (l.bb[0] + l.bb[2]) / 2;
  const cy = oy ?? (l.bb[1] + l.bb[3]) / 2;
  return <path d={l.d} fill={color} transform={`translate(${cx + dx} ${cy + dy}) rotate(${rot}) scale(${s}) translate(${-cx} ${-cy})`} />;
};

// "percepção.": empurrada pela seta, letra por letra
const PUSH_START = 82;
const arrowFront = (f: number) => (f < PUSH_START ? -1e4 : lerp(40, 1500, pr(f, PUSH_START, 108, Easing.bezier(0.33, 0, 0.67, 1))));
const contactFrame = (x: number) => {
  for (let k = PUSH_START; k < 120; k += 0.25) if (arrowFront(k) >= x) return k;
  return 1e4;
};
const B4 = T2.b4.lines[0].letters.map((l) => ({l, tc: contactFrame(l.bb[0] + 10)}));

const Block: React.FC<{f: number; look: Look; camera: number}> = ({f, look, camera}) => {
  const out: React.ReactNode[] = [];
  // linha 1: "Esse vídeo vai" sobe da linha de base, palavra a palavra
  T2.b1.lines[0].letters.forEach((l, i) => {
    const st = 2 + l.word * 4;
    if (f < st) return;
    const p = pr(f, st, st + 14);
    out.push(<g key={`a${i}`} clipPath="url(#c1)"><Glyph l={l} color={look.fg} dy={(1 - p) * l.size * 1.3} /></g>);
  });
  // linha 2: MUDAR chega de longe e ocupa a largura
  {
    const ln = T2.b2.lines[0];
    if (f >= 14) {
      const p = pr(f, 14, 30);
      const cx = (ln.bb[0] + ln.bb[2]) / 2;
      const cy = (ln.bb[1] + ln.bb[3]) / 2;
      out.push(
        <g key="mudar" transform={`translate(${cx} ${cy}) scale(${lerp(0.22, 1, p)}) translate(${-cx} ${-cy})`}>
          {ln.letters.map((l, i) => <path key={i} d={l.d} fill={look.fg} />)}
        </g>,
      );
    }
  }
  // linha 3: "a sua" desliza da direita, encaixada acima de "percepção"
  T2.b3.lines[0].letters.forEach((l, i) => {
    const st = 34 + l.word * 4;
    if (f < st) return;
    const p = pr(f, st, st + 14);
    out.push(<g key={`c${i}`} clipPath="url(#c3)"><Glyph l={l} color={look.fg} dy={(1 - p) * l.size * 1.3} /></g>);
  });
  // linha 4: "percepção." sobe letra a letra; depois a seta empurra cada letra para fora de cena
  B4.forEach(({l, tc}, i) => {
    const st = 44 + i * 1.3;
    if (f < st) return;
    const p = pr(f, st, st + 14);
    if (f >= tc) {
      // ganha a velocidade do empurrão e sai sempre à frente da seta, girando em arco
      const t = f - tc;
      const ahead = arrowFront(f) - arrowFront(tc);
      const dir = hs(i * 7) > -0.2 ? 1 : -1;
      out.push(
        <Glyph key={`d${i}`} l={l} color={look.key} dx={ahead + 30 + t * (16 + 8 * hs(i))} dy={-t * (12 + 6 * hs(i * 3)) + 0.7 * t * t} rot={dir * t * (10 + 4 * hs(i * 5))} />,
      );
    } else out.push(<g key={`d${i}`} clipPath="url(#c4)"><Glyph l={l} color={look.key} dy={(1 - p) * l.size * 1.3} /></g>);
  });
  return <g transform={`translate(540 960) scale(${camera}) translate(-540 -960)`}>{out}</g>;
};

// ============ TRAÇOS DE GESTO (nascem, viajam e se recolhem) ============
const Gesture: React.FC<{d: string; t: number; color: string; w?: number}> = ({d, t, color, w = 10}) => {
  if (t <= 0 || t >= 1) return null;
  const head = expoOut(cl(t / 0.65));
  const tail = expoIn(cl((t - 0.25) / 0.75));
  const len = Math.max(0.001, head - tail);
  return <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={w * (1 - 0.5 * tail)} strokeLinecap="round" strokeDasharray={`${len} 2`} strokeDashoffset={-tail} />;
};

// ============ CENA ============
const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const cover = f >= 126 && f < 129;
  const post = f >= 129;

  // câmera avança junto com o mergulho da seta
  const camera = 1 + 0.8 * pr(f, 112, 126, expoIn);

  // máscaras circulares que trocam fundo e cores
  const wipe1 = 1500 * pr(f, 24, 40, expoIO); // azul > amarelo, nasce no centro de MUDAR
  const wipe2 = 2300 * pr(f, 70, 88, expoIO); // amarelo > azul, nasce de onde a seta entra

  // ---- SETA (rígida; expressão por arco, antecipação, pausa e squash discreto) ----
  const TIPRIGHT = 109.6; // rotação em que a ponta aponta para a direita
  let ax = 0;
  let ay = 0;
  let rot = 0;
  let sc = 1.9;
  let stretch = 1;
  let show = false;
  const y4 = (T2.b4.lines[0].bb[1] + T2.b4.lines[0].bb[3]) / 2;
  if (f >= 70 && f < 126) {
    show = true;
    if (f < 82) {
      // entra em arco pelo canto inferior esquerdo, freia antes do contato (antecipação)
      const t = pr(f, 70, 80);
      ax = lerp(-220, -10, t) - 26 * Math.sin(Math.PI * pr(f, 78, 82, expoIO));
      ay = lerp(1640, y4, t) + 60 * Math.sin(Math.PI * t);
      rot = lerp(TIPRIGHT - 55, TIPRIGHT - 8, t);
      stretch = 1 - 0.06 * Math.sin(Math.PI * pr(f, 78, 82, expoIO));
    } else if (f < 108) {
      // empurra: avança firme, corpo levemente comprimido pelo esforço
      ax = arrowFront(f) - 70;
      ay = y4;
      rot = TIPRIGHT - 8 + 2 * Math.sin(f * 0.8);
      stretch = 0.93;
    } else if (f < 118) {
      // sai pela direita e volta em arco, olhando para a câmera
      const t = pr(f, 108, 118, expoIO);
      ax = lerp(1300, 540, t);
      ay = lerp(y4, 900, t) - 280 * Math.sin(Math.PI * t);
      rot = lerp(TIPRIGHT - 8, -360, t);
    } else {
      // mergulha na câmera: cresce até cobrir a tela
      const t = pr(f, 118, 126, expoIn);
      ax = 540 + 40 * t;
      ay = 900 + 120 * t;
      rot = -360;
      sc = 1.9 * lerp(1, 40, t);
      stretch = 1 + 0.08 * Math.sin(Math.PI * pr(f, 116, 120));
    }
  }
  // depois do corte: a seta (azul) se afasta da câmera e pousa ao lado do coração
  if (post) {
    show = true;
    const t = pr(f, 129, 150);
    ax = lerp(560, 330, t);
    ay = lerp(1000, 1290, t);
    rot = lerp(-360, -372, t);
    sc = 1.7 * lerp(5, 1, t);
    stretch = f >= 150 && f < 160 ? 1 - 0.07 * Math.sin(Math.PI * pr(f, 150, 160, expoIO)) : 1;
  }

  const gestures: React.ReactNode[] = [];
  if (f >= 82 && f < 96) {
    // impacto: três traços curvos saem do ponto de contato
    const cx = 60;
    const cy = y4;
    [-1, 0, 1].forEach((k) =>
      gestures.push(<Gesture key={`g${k}`} t={(f - 82 - Math.abs(k)) / 12} color={ACCENT} d={`M${cx + 30} ${cy - 90 + k * 50} Q${cx + 70 + k * 10} ${cy - 150 + k * 80} ${cx + 40 + k * 30} ${cy - 210 + k * 120}`} />),
    );
  }
  if (f >= 84 && f < 108) {
    // linhas de velocidade atrás da seta, em ciclos
    for (let k = 0; k < 3; k++) {
      const t = ((f - 84 + k * 3) % 9) / 9;
      const x0 = ax - 170;
      const yy = y4 - 40 + k * 40;
      gestures.push(<Gesture key={`s${k}`} t={t} color={ACCENT} w={9} d={`M${x0} ${yy} Q${x0 - 90} ${yy + (k - 1) * 8} ${x0 - 220} ${yy + (k - 1) * 20}`} />);
    }
  }
  if (f >= 150 && f < 166) {
    // ao pousar: dois traços suaves de contentamento
    [0, 1].forEach((k) => gestures.push(<Gesture key={`p${k}`} t={(f - 150 - k * 2) / 14} color={BLUE} w={9} d={`M${ax + 90 + k * 40} ${ay - 120} Q${ax + 130 + k * 40} ${ay - 170} ${ax + 120 + k * 50} ${ay - 230}`} />));
  }

  // celular: entra com movimento de câmera e segue com deriva leve; personagem entra rolando
  const phoneIn = pr(f, 129, 152);
  const drift = f > 152 ? (f - 152) * 0.0012 : 0;
  const phoneScale = lerp(1.35, 1, phoneIn) + drift;
  const roll = lerp(-260, 0, pr(f, 138, 166));

  const look = (L: Look) => <Block f={f} look={L} camera={camera} />;
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      <defs>
        {lineClip('b1', 'c1')}
        {lineClip('b3', 'c3')}
        {lineClip('b4', 'c4')}
        <clipPath id="w1"><circle cx={540} cy={830} r={wipe1} /></clipPath>
        <clipPath id="w2"><circle cx={-120} cy={1600} r={wipe2} /></clipPath>
      </defs>
      {!post && !cover ? (
        <>
          <rect width={1080} height={1920} fill={LOOK_A.bg} />
          {look(LOOK_A)}
          {wipe1 > 0 ? (
            <g clipPath="url(#w1)">
              <rect width={1080} height={1920} fill={LOOK_B.bg} />
              {look(LOOK_B)}
            </g>
          ) : null}
          {wipe2 > 0 ? (
            <g clipPath="url(#w2)">
              <rect width={1080} height={1920} fill={LOOK_C.bg} />
              {look(LOOK_C)}
            </g>
          ) : null}
        </>
      ) : null}
      {cover || post ? <rect width={1080} height={1920} fill={ACCENT} /> : null}
      {post ? (
        <g transform={`translate(540 ${PHONE.y + PHONE.h / 2}) scale(${phoneScale}) translate(-540 ${-(PHONE.y + PHONE.h / 2)})`}>
          <SocialPost c={BLUE} bg={ACCENT} roll={roll} />
        </g>
      ) : null}
      {gestures}
      {show && !cover ? <RubberArrow x={ax} y={ay} rot={rot} scale={sc} rig={{stretch}} fill={post ? BLUE : ACCENT} /> : null}
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
