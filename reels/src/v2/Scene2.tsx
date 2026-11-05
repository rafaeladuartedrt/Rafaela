import React from 'react';
import {AbsoluteFill, useCurrentFrame, Easing} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {warpFrame, Seg} from './warp';
import {BLUE, LIGHT, ACCENT, T2, RubberArrow, SocialPost, PHONE, ADMark, st} from './kit';

// ============ CENA 2: VISÃO ============
const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
const expoIn = Easing.bezier(0.7, 0, 0.84, 0);
const expoIO = Easing.bezier(0.87, 0, 0.13, 1);
const cl = (v: number) => Math.min(1, Math.max(0, v));
const pr = (f: number, a: number, b: number, e: (t: number) => number = expoOut) => e(cl((f - a) / (b - a)));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// câmera sobre o celular: escala e centro vertical
// câmera: recua (abre espaço ao texto), mergulha na tela do celular (foto borrada em primeiro plano) e recua de novo
const ZIN = [72, 94];
const ZOUT = [172, 194];
const camPhase = (f: number) => pr(f, ZIN[0], ZIN[1], expoIO) * (1 - pr(f, ZOUT[0], ZOUT[1], expoIO));
const camK = (f: number) => lerp(lerp(1, 0.66, pr(f, 0, 16, expoIO)), 1.62, camPhase(f));
const camY = (f: number) => lerp(lerp(890, 1135, pr(f, 0, 16, expoIO)), 960, camPhase(f));
const camF = (f: number) => lerp(890, PHONE.y + 150 + (PHONE.w - 88) / 2, camPhase(f));
const mapP = (f: number, x: number, y: number): [number, number] => [540 + (x - 540) * camK(f), camY(f) + (y - camF(f)) * camK(f)];
const phoneT = (f: number) => `translate(540 ${camY(f)}) scale(${camK(f)}) translate(-540 ${-camF(f)})`;

// posição do selo AD dentro do post (coordenadas do celular)
const PX = PHONE.x + 44;
const PY = PHONE.y + 150;
const AD_P: [number, number] = [PX + 100, PY + 66];
const HEART_P: [number, number] = [PX + 26, PY + (PHONE.w - 88) + 52];

const AD_START = 140;
const AD_BIG: [number, number] = [540, 960]; // o selo nasce grande no centro
const AD_LAND = 178; // e pousa no lugar dele na foto
const LIGHT_ON = 154; // o AD "acende" e a cor se espalha a partir dele
const CLICK = 222;
const CLICK2 = 250; // clique em AUDIODESCRIÇÃO
const PHONE_OUT = 254;
const REORG = 260;
const TAKEOVER = 300; // a seta toca o ponto final
const HOP_END = 314; // o ponto salta na frente da seta e quica
const INFLATE = 316; // e infla até tomar a tela

// palavras de A1 e A2 na mesma ordem: cada palavra viaja e muda de tamanho como um bloco
type W = {letters: (typeof T2)['A1']['lines'][0]['letters']; ox: number; oy: number; size: number};
const wordsOf = (id: string): W[] => {
  const out: W[] = [];
  T2[id].lines.forEach((ln) => {
    let cur = -1;
    ln.letters.forEach((l) => {
      if (l.word !== cur) {
        cur = l.word;
        out.push({letters: [], ox: l.x, oy: ln.y, size: l.size});
      }
      out[out.length - 1].letters.push(l);
    });
  });
  return out;
};
const WA = wordsOf('A1');
const WB = wordsOf('A2');
const WORD_AD = WA.find((w) => w.letters[0].color === 'O')!; // AUDIODESCRIÇÃO,
const DOT_LAST = WA[WA.length - 1].letters[WA[WA.length - 1].letters.length - 1]; // ponto final de "vê."
const AD_WORD_C: [number, number] = [(WORD_AD.letters[0].bb[0] + WORD_AD.letters[WORD_AD.letters.length - 1].bb[2]) / 2, (WORD_AD.letters[0].bb[1] + WORD_AD.letters[0].bb[3]) / 2];

// Traço de gesto: nasce, viaja e se recolhe
const Gesture: React.FC<{d: string; t: number; color: string; w?: number}> = ({d, t, color, w = 10}) => {
  if (t <= 0 || t >= 1) return null;
  const head = expoOut(cl(t / 0.65));
  const tail = expoIn(cl((t - 0.3) / 0.7));
  return <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={w * (1 - 0.5 * tail)} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${Math.max(0.001, head - tail)} 2`} strokeDashoffset={-tail} />;
};
// ponto de interrogação: se desenha, fica no ar balançando e depois se recolhe
const QMark: React.FC<{x: number; y: number; t: number; color: string; s?: number; rot?: number; f: number}> = ({x, y, t, color, s = 1, rot = 0, f}) => {
  if (t <= 0 || t >= 1) return null;
  const head = expoOut(cl(t / 0.28));
  const tail = expoIn(cl((t - 0.78) / 0.22));
  const sway = 7 * Math.sin(f * 0.22 + x * 0.01) * (1 - tail);
  const bob = 6 * Math.sin(f * 0.18 + y * 0.02);
  const dot = 11 * (t > 0.24 ? expoOut(cl((t - 0.24) / 0.12)) : 0) * (1 - tail);
  return (
    <g transform={`translate(${x} ${y + bob}) rotate(${rot + sway}) scale(${s})`}>
      <path d="M-24 -32 C-26 -66 26 -70 26 -34 C26 -10 0 -8 0 18" pathLength={1} fill="none" stroke={color} strokeWidth={24 / s} strokeLinecap="round" strokeDasharray={`${Math.max(0.001, head - tail)} 2`} strokeDashoffset={-tail} />
      {dot > 0.4 ? <circle cx={0} cy={52} r={(dot * 1.5) / s} fill={color} /> : null}
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
const TextBlock: React.FC<{id: string; f: number; start: number[]; exit?: number; colors: Record<string, string>; pulseWord?: number}> = ({id, f, start, exit = 1e4, colors, pulseWord = 0}) => (
  <g>
    {T2[id].lines.map((ln, li) =>
      ln.letters.map((l, i) => {
        const st = start[li] + i * 0.8;
        if (f < st) return null;
        const p = pr(f, st, st + 14);
        const e = pr(f, exit + li * 2, exit + li * 2 + 10, expoIn);
        return (
          <g key={`${li}-${i}`} clipPath={`url(#${id}c${li})`}>
            <path d={l.d} fill={colors[l.color]} transform={l.color === 'O' && pulseWord > 0 ? `translate(540 ${(ln.bb[1] + ln.bb[3]) / 2}) scale(${1 + 0.07 * pulseWord}) translate(-540 ${-(ln.bb[1] + ln.bb[3]) / 2})` : `translate(0 ${((1 - p) + e) * l.size * 1.3})`} />
          </g>
        );
      }),
    )}
  </g>
);

// onde a seta termina a cena 2 (a cena 3 começa exatamente dali)
const S2_VE = WB[WB.length - 1];
const S2_K = S2_VE.size / WA[WA.length - 1].size;
export const S2_ARROW_END = {
  x: S2_VE.ox + ((DOT_LAST.bb[0] + DOT_LAST.bb[2]) / 2 - WA[WA.length - 1].ox) * S2_K + 96,
  y: S2_VE.oy + ((DOT_LAST.bb[1] + DOT_LAST.bb[3]) / 2 - WA[WA.length - 1].oy) * S2_K + 110,
  rot: -24,
  sc: 1.5,
};

const Scene: React.FC<{segs?: Seg[]}> = ({segs = []}) => {
  const f = warpFrame(useCurrentFrame(), segs);
  const wipe = 2400 * pr(f, LIGHT_ON, LIGHT_ON + 18, expoIO);
  const adC: [number, number] = AD_BIG; // a cor se espalha a partir do selo em destaque

  // desfoque progressivo da foto (baixa visão); volta a ficar nítida quando o AD acende
  const blurA = 18 * pr(f, 14, 56, Easing.bezier(0.45, 0, 0.55, 1));
  const blurB = blurA * (1 - pr(f, LIGHT_ON, LIGHT_ON + 14));
  // a frase-problema também desfoca por no máximo 1 segundo
  const textBlur = 9 * Math.sin(Math.PI * cl((f - 48) / 20)) * (f >= 48 && f < 68 ? 1 : 0);

  // ---- SETA ----
  const rest = mapP(f, 330, 1290);
  let ax = rest[0];
  let ay = rest[1];
  let rot = -12;
  let sc = 1.7 * camK(f);
  let stretch = 1;
  // percebe a foto ficando turva: inclina a ponta na direção dela
  if (f >= 16 && f < 44) rot = -12 + 30 * pr(f, 16, 28, expoIO);
  // perdida: se afasta da câmera e procura, com pausas e hesitação
  if (f >= 44 && f < 188) {
    // posição inicial (no celular) até o mergulho; depois um caminho de busca em tela cheia
    const start = mapP(Math.min(f, 70), 330, 1290);
    const path: [number, number][] = [
      [start[0], start[1]],
      [760, 1400],
      [850, 760],
      [240, 700],
      [230, 1260],
      [540, 1380],
    ];
    const T0 = 70;
    const segLen = 14;
    let px = start[0];
    let py = start[1];
    let rr = 18;
    let ss = 1;
    if (f >= T0) {
      const k = Math.min(path.length - 2, Math.floor((f - T0) / segLen));
      const u = expoIO(cl((f - T0) / segLen - k));
      const done = f >= T0 + segLen * (path.length - 1);
      const kk = done ? path.length - 2 : k;
      const uu = done ? 1 : u;
      px = lerp(path[kk][0], path[kk + 1][0], uu);
      py = lerp(path[kk][1], path[kk + 1][1], uu) - 60 * Math.sin(Math.PI * uu);
      rr = 18 + [-35, 30, -40, 25, -10][kk] * Math.sin(Math.PI * uu) + (kk === 2 ? 360 * uu : 0);
      ss = 1 + 0.06 * Math.sin(Math.PI * uu);
    }
    // espera o AD: olha para o centro
    if (f >= 140) rr = lerp(rr, -20, pr(f, 140, 150, expoIO));
    const z = 1 + 0.4 * pr(f, 44, 60, expoIO) - 0.4 * pr(f, 178, 188, expoIO);
    ax = px;
    ay = py;
    rot = rr;
    sc = 1.7 * lerp(0.66, 1, camPhase(f) > 0 ? 1 : 0) / z;
    if (f < 70) sc = (1.7 * camK(f)) / z;
    stretch = ss;
  }
  // reencontra o caminho: volta perto, quica de alegria e clica no coração
  const heart = mapP(f, HEART_P[0], HEART_P[1]);
  if (f >= 188) {
    const t = pr(f, 188, 212, expoIO);
    ax = lerp(540, heart[0] + 38, t);
    ay = lerp(1380, heart[1] + 62, t) - 140 * Math.sin(Math.PI * t);
    rot = lerp(-20, -14, t) - 360 * pr(f, 190, 208, expoIO);
    sc = 1.7 * camK(f) * (1 + 0.15 * Math.sin(Math.PI * t));
    // antecipação e clique
    const ant = pr(f, 212, 218, expoOut) * (1 - pr(f, 218, CLICK, expoIn));
    ax += 14 * ant;
    ay += 20 * ant;
    stretch = 1 + 0.08 * ant - 0.14 * Math.sin(Math.PI * pr(f, CLICK, CLICK + 6, expoIO));
  }
  const VEw = WB[WB.length - 1];
  const dotFinal: [number, number] = [VEw.ox + ((DOT_LAST.bb[0] + DOT_LAST.bb[2]) / 2 - WA[WA.length - 1].ox) * (VEw.size / WA[WA.length - 1].size), VEw.oy + ((DOT_LAST.bb[1] + DOT_LAST.bb[3]) / 2 - WA[WA.length - 1].oy) * (VEw.size / WA[WA.length - 1].size)];
  const dotRad = ((DOT_LAST.bb[2] - DOT_LAST.bb[0]) / 2) * (VEw.size / WA[WA.length - 1].size) * lerp(1, 75, pr(f, INFLATE, INFLATE + 16, expoIn));
  // ponta da seta fica a (cA * escala) do pivô, na direção da ponta
  const tipOff = (r: number, k: number): [number, number] => {
    const a = (r * Math.PI) / 180;
    const d: [number, number] = [-0.336 * 64.8 * k, -0.942 * 64.8 * k];
    return [d[0] * Math.cos(a) - d[1] * Math.sin(a), d[0] * Math.sin(a) + d[1] * Math.cos(a)];
  };
  if (f >= 230) {
    const k = 1.7 * 0.8;
    const r = -160; // ponta para baixo, corpo no vazio à direita de "Com"
    const o = tipOff(r, k);
    const target: [number, number] = [AD_WORD_C[0] + 220 - o[0], AD_WORD_C[1] - 46 - o[1]];
    const t = pr(f, 230, 246, expoIO);
    const from: [number, number] = [heart[0] + 38, heart[1] + 62];
    ax = lerp(from[0], target[0], t);
    ay = lerp(from[1], target[1], t) - 160 * Math.sin(Math.PI * t);
    rot = lerp(-14, r + 360, t);
    sc = lerp(1.7 * camK(f), k, t);
    const ant = pr(f, 244, 248, expoOut) * (1 - pr(f, 248, CLICK2, expoIn));
    ay -= 22 * ant;
    stretch = 1 + 0.07 * ant - 0.12 * Math.sin(Math.PI * pr(f, CLICK2, CLICK2 + 6, expoIO));
    if (f >= 262) {
      const t2 = pr(f, 262, 284, expoIO);
      ax = lerp(target[0], dotFinal[0] + 96, t2);
      ay = lerp(target[1], dotFinal[1] + 110, t2) - 120 * Math.sin(Math.PI * t2);
      rot = lerp(r + 360, 336, t2);
      sc = lerp(k, 1.5, t2);
      stretch = f >= 284 && f < 294 ? 1 - 0.07 * Math.sin(Math.PI * pr(f, 284, 294, expoIO)) : 1;
      // toque no ponto: antecipação e clique
      const ant2 = pr(f, 292, 297, expoOut) * (1 - pr(f, 297, TAKEOVER, expoIn));
      ax += 16 * ant2;
      ay += 20 * ant2;
      if (f >= TAKEOVER) stretch = 1 - 0.12 * Math.sin(Math.PI * pr(f, TAKEOVER, TAKEOVER + 6, expoIO));
      // susto: o ponto pula na frente dela
      if (f >= TAKEOVER + 4 && f < HOP_END + 6) {
        const j = Math.sin(Math.PI * pr(f, TAKEOVER + 4, HOP_END + 6, expoIO));
        ay -= 30 * j;
        rot += 8 * j;
      }
    }
  }
  const inBlue = Math.hypot(ax - adC[0], ay - adC[1]) < wipe;
  const inLight = f >= INFLATE && Math.hypot(ax - dotFinal[0], ay - dotFinal[1]) < dotRad;
  const arrowColor = inLight ? BLUE : inBlue ? ACCENT : BLUE;
  const heartFill = f >= CLICK ? pr(f, CLICK, CLICK + 10) : 0;

  const gestures: React.ReactNode[] = [];
  // três dúvidas grandes que se acumulam em volta da seta enquanto ela procura
  const qx = (x: number) => Math.min(960, Math.max(120, x));
  const qy = (y: number) => Math.max(900, y);
  void qx;
  void qy;
  gestures.push(<QMark key="q1" f={f} x={860} y={560} t={(f - 96) / 56} color={arrowColor} s={2.4} rot={-12} />);
  gestures.push(<QMark key="q2" f={f} x={200} y={820} t={(f - 108) / 48} color={arrowColor} s={2.0} rot={14} />);
  gestures.push(<QMark key="q3" f={f} x={880} y={1320} t={(f - 120) / 38} color={arrowColor} s={1.5} rot={-6} />);
  if (f >= CLICK && f < CLICK + 18) {
    [-1, 0, 1].forEach((k) =>
      gestures.push(<Gesture key={`h${k}`} t={(f - CLICK - Math.abs(k)) / 16} color={ACCENT} d={`M${heart[0] - 10 + k * 30} ${heart[1] - 40} Q${heart[0] - 20 + k * 50} ${heart[1] - 90} ${heart[0] - 10 + k * 80} ${heart[1] - 140}`} />),
    );
  }

  const out = 1500 * pr(f, PHONE_OUT, PHONE_OUT + 16, expoIn);
  if (f >= CLICK2 && f < CLICK2 + 18) {
    [-1, 0, 1].forEach((k) =>
      gestures.push(<Gesture key={`w${k}`} t={(f - CLICK2 - Math.abs(k)) / 16} color={ACCENT} d={`M${AD_WORD_C[0] + 270} ${AD_WORD_C[1] - 60 + k * 30} Q${AD_WORD_C[0] + 330} ${AD_WORD_C[1] - 80 + k * 50} ${AD_WORD_C[0] + 390} ${AD_WORD_C[1] - 110 + k * 80}`} />),
    );
  }
  const phone = (c: string, bg: string, blur: number, uid: string, heartColor?: string) => (
    <g transform={`translate(0 ${out}) ${phoneT(f)}`}>
      <SocialPost uid={uid} c={c} bg={bg} blur={blur} ad={f >= AD_LAND ? 1 : 0} heart={heartFill} heartColor={heartColor} />
    </g>
  );
  // selo AD em destaque: nasce grande, as ondas pulsam como som, depois voa até a foto
  let adOverlay: React.ReactNode = null;
  if (f >= AD_START && f < AD_LAND) {
    const dest = mapP(f, PX + 40 + 80, PY + 90 - 24);
    const t = pr(f, 162, AD_LAND, expoIO);
    const cx = lerp(AD_BIG[0], dest[0], t);
    const cy = lerp(AD_BIG[1], dest[1], t);
    const S = lerp(3.4, camK(f), t);
    const col = f >= LIGHT_ON ? LIGHT : BLUE;
    const waves: React.ReactNode[] = [];
    for (let k = 0; k < 3; k++) {
      const w = ((f - AD_START - 8 - k * 5) % 15) / 15;
      if (f - AD_START - 8 - k * 5 < 0 || t > 0.3) continue;
      const r = 60 + w * 70;
      waves.push(<path key={k} d={`M${100 + r * Math.cos(-0.85)} ${-24 + r * Math.sin(-0.85)} A${r} ${r} 0 0 1 ${100 + r * Math.cos(0.85)} ${-24 + r * Math.sin(0.85)}`} {...st(col, 8 * (1 - w))} />);
    }
    adOverlay = (
      <g transform={`translate(${cx} ${cy}) scale(${S}) translate(-80 24)`}>
        <ADMark x={0} y={0} c={col} p={pr(f, AD_START, AD_START + 14)} />
        {waves}
      </g>
    );
  }
  const ring = f >= LIGHT_ON - 4 && f < LIGHT_ON + 10 ? <circle cx={adC[0]} cy={adC[1]} r={lerp(160, 420, pr(f, LIGHT_ON - 4, LIGHT_ON + 10))} fill="none" stroke={BLUE} strokeWidth={10 * (1 - pr(f, LIGHT_ON - 4, LIGHT_ON + 10))} /> : null;

  const VE = WB[WB.length - 1].letters;
  const DOTL = VE[VE.length - 1];
  const dotC: [number, number] = [(DOTL.bb[0] + DOTL.bb[2]) / 2, (DOTL.bb[1] + DOTL.bb[3]) / 2];
  const dotS = lerp(1, 75, pr(f, INFLATE, INFLATE + 16, expoIn));
  // salto: arco para cima e para a frente, com amassada ao sair e ao cair
  const hopT = cl((f - TAKEOVER - 2) / (HOP_END - TAKEOVER - 2));
  const hopY = f >= TAKEOVER + 2 && f < HOP_END ? -200 * 4 * hopT * (1 - hopT) : 0; // quica no lugar
  const hopX = 0;
  const squash = f >= HOP_END && f < HOP_END + 3 ? [1.3, 0.7] : f >= TAKEOVER + 2 && f < HOP_END ? [0.92, 1.1] : [1, 1];
  const dotR = ((DOTL.bb[2] - DOTL.bb[0]) / 2) * dotS;
  const cam = undefined;
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      <g transform={cam}>
      <defs>
        {[0, 1].map((li) => lineClip('Q1', li, `Q1c${li}`))}
        {[0, 1, 2].map((li) => lineClip('A1', li, `A1c${li}`))}
        <clipPath id="wipe2"><circle cx={adC[0]} cy={adC[1]} r={wipe} /></clipPath>
        <filter id="tb" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation={textBlur} /></filter>
      </defs>
      {/* problema: fundo amarelo, tudo azul */}
      <rect width={1080} height={1920} fill={ACCENT} />
      <g filter={textBlur > 0.3 ? 'url(#tb)' : undefined}>
        <TextBlock id="Q1" f={f} start={[12, 18]} exit={66} colors={{B: BLUE, L: BLUE, O: BLUE}} />
      </g>
      {phone(BLUE, ACCENT, blurA, 'a')}
      {ring}
      {/* solução: o AD acende e espalha o azul; foto nítida, palavra-chave em amarelo */}
      {wipe > 0 ? (
        <g clipPath="url(#wipe2)">
          <rect width={1080} height={1920} fill={BLUE} />
          {f < REORG ? (
            <g transform={f >= CLICK2 ? `translate(${AD_WORD_C[0]} ${AD_WORD_C[1]}) scale(1) translate(${-AD_WORD_C[0]} ${-AD_WORD_C[1]})` : undefined}>
              <TextBlock id="A1" f={f} start={[184, 190, 198]} colors={{L: LIGHT, O: ACCENT, B: LIGHT}} pulseWord={f >= CLICK2 ? Math.sin(Math.PI * pr(f, CLICK2, CLICK2 + 10, expoIO)) : 0} />
            </g>
          ) : (
            WA.map((w, k) => {
              const n = WB[k];
              const t = pr(f, REORG + (WA.length - 1 - k) * 2.5, REORG + (WA.length - 1 - k) * 2.5 + 20, expoIO); // de baixo para cima
              const sc = lerp(1, n.size / w.size, t);
              const x = lerp(w.ox, n.ox, t);
              const y = lerp(w.oy, n.oy, t);
              return (
                <g key={k} transform={`translate(${x} ${y}) scale(${sc}) translate(${-w.ox} ${-w.oy})`}>
                  {w.letters.map((l, i) => (l === DOT_LAST ? null : <path key={i} d={l.d} fill={l.color === 'O' ? ACCENT : LIGHT} />))}
                </g>
              );
            })
          )}
          {phone(LIGHT, BLUE, blurB, 'b', ACCENT)}
        </g>
      ) : null}
      {adOverlay}
      {gestures}
      {f >= REORG ? (() => {
        const w = WA[WA.length - 1];
        const n = WB[WB.length - 1];
        const k = WA.length - 1;
        const t = pr(f, REORG + (WA.length - 1 - k) * 2.5, REORG + (WA.length - 1 - k) * 2.5 + 20, expoIO); // de baixo para cima
        const sc2 = lerp(1, n.size / w.size, t);
        const x = lerp(w.ox, n.ox, t);
        const y = lerp(w.oy, n.oy, t);
        const dc0 = [(DOT_LAST.bb[0] + DOT_LAST.bb[2]) / 2, (DOT_LAST.bb[1] + DOT_LAST.bb[3]) / 2];
        const k2 = n.size / w.size;
        return (
          <g transform={`translate(${hopX} ${hopY}) translate(${x} ${y}) scale(${sc2}) translate(${-w.ox} ${-w.oy})`}>
            <path d={DOT_LAST.d} fill={LIGHT} transform={`translate(${dc0[0]} ${dc0[1]}) scale(${dotS}) translate(${-dc0[0]} ${-dc0[1]}) translate(${dc0[0]} ${DOT_LAST.bb[3]}) scale(${squash[0]} ${squash[1]}) translate(${-dc0[0]} ${-DOT_LAST.bb[3]})`} />
          </g>
        );
        void k2;
      })() : null}
      <RubberArrow x={ax} y={ay} rot={rot} scale={sc} rig={{stretch}} fill={arrowColor} />
      </g>
    </svg>
  );
};

export const Scene2: React.FC<{blur?: boolean; segs?: Seg[]}> = ({blur = true, segs = []}) => (
  <AbsoluteFill style={{backgroundColor: ACCENT}}>
    {blur ? (
      <CameraMotionBlur shutterAngle={180} samples={8}>
        <Scene segs={segs} />
      </CameraMotionBlur>
    ) : (
      <Scene segs={segs} />
    )}
  </AbsoluteFill>
);
