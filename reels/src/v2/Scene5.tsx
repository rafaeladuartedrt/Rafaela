import React from 'react';
import {AbsoluteFill, useCurrentFrame, spring, Easing} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {BLUE, LIGHT, ACCENT, T2, RubberArrow} from './kit';

// ============ CENA 5: VIRADA (final) ============
const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
const expoIn = Easing.bezier(0.7, 0, 0.84, 0);
const expoIO = Easing.bezier(0.87, 0, 0.13, 1);
const cl = (v: number) => Math.min(1, Math.max(0, v));
const pr = (f: number, a: number, b: number, e: (t: number) => number = expoOut) => e(cl((f - a) / (b - a)));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sp = (f: number, s: number, damping = 10, stiffness = 150) => (f < s ? 0 : spring({frame: f - s, fps: 30, config: {damping, stiffness, mass: 1}}));

const LINE_Y = 1000; // linha herdada da rampa achatada
const A_IN = 4;
const A_OUT = 74;
const B_IN = 90;
const CRACK = 116; // a linha vira o corte de BARREIRA
const OPEN = 136; // a palavra se divide na horizontal
const CLOSE = 160; // e se junta de novo
const C_OUT = 188; // a frase sai
const WRITE = 198; // ACESSIBILIDADE é escrita traço a traço
const PULSE = 246;
export const SCENE5_LEN = 310;

const B_LINE = T2.S5b.lines[1];
const BAR = B_LINE.letters.filter((l) => l.weight === 800); // BARREIRA.
const BX1 = BAR[0].bb[0];
const BX2 = BAR[BAR.length - 1].bb[2];
const BCX = (BX1 + BX2) / 2;
const CUT_Y = B_LINE.y - BAR[0].size * 0.35;

// texto que nasce da linha (a linha é o chão: tudo abaixo dela fica escondido)
const RiseFromLine: React.FC<{id: string; f: number; ins: number[]; out: number; skip?: (l: (typeof BAR)[number]) => boolean}> = ({id, f, ins, out, skip}) => (
  <g clipPath="url(#aboveLine)">
    {T2[id].lines.map((ln, li) =>
      ln.letters.map((l, i) => {
        if (skip && skip(l)) return null;
        const st = ins[li] + i * 0.6;
        if (f < st) return null;
        const p = pr(f, st, st + 14);
        const e = pr(f, out, out + 12, expoIn);
        const depth = LINE_Y - T2[id].lines[0].bb[1] + 20; // o bloco sobe inteiro, sem uma linha atravessar a outra
        return <path key={`${li}-${i}`} d={l.d} fill={l.color === 'O' ? ACCENT : LIGHT} transform={`translate(0 ${(1 - p + e) * depth})`} />;
      }),
    )}
  </g>
);

const Scene: React.FC = () => {
  const f = useCurrentFrame();

  // ---- a linha: chão das frases, depois vira o corte de BARREIRA ----
  const lineX1 = lerp(lerp(-40, 80, pr(f, 0, 14, expoIO)), BX1 - 24, pr(f, CRACK, CRACK + 16, expoIO));
  const lineX2 = lerp(lerp(1120, 1000, pr(f, 0, 14, expoIO)), BX2 + 24, pr(f, CRACK, CRACK + 16, expoIO));
  const lineY = lerp(LINE_Y, CUT_Y, pr(f, CRACK, CRACK + 16, expoIO));
  const toYellow = pr(f, CRACK - 6, CRACK + 6, expoIO); // fica amarela da esquerda para a direita
  const lineGone = f >= OPEN + 2;

  // ---- BARREIRA: divisão horizontal orgânica e reencontro elástico ----
  const opening = pr(f, OPEN, OPEN + 16, expoIO);
  const closing = f < CLOSE ? 0 : sp(f, CLOSE, 7, 70);
  const open = Math.max(-0.12, opening - closing);
  const split = Math.abs(open) > 0.004;
  const barExit = pr(f, C_OUT, C_OUT + 12, expoIn);
  const barLetter = (l: (typeof BAR)[number], i: number, top: boolean) => {
    const dir = top ? -1 : 1;
    const u = ((l.bb[0] + l.bb[2]) / 2 - BX1) / (BX2 - BX1);
    const wave = Math.sin(u * Math.PI * 2.2 - f * 0.22);
    const a = Math.abs(open);
    const dy = top ? -(open * 26 + a * 10 * wave) : open * 54 + a * 16 * wave;
    const dx = dir * open * 18 + a * 10 * Math.cos(u * Math.PI * 2 - f * 0.18);
    const rot = dir * a * 6 * wave;
    const sy = top ? 1 + 0.18 * a * (0.6 + 0.4 * wave) : 1 - 0.14 * a * (0.6 + 0.4 * wave);
    const ox = (l.bb[0] + l.bb[2]) / 2;
    return (
      <g key={`${top}${i}`} transform={`translate(${dx} ${dy}) translate(${ox} ${CUT_Y}) rotate(${rot}) scale(${1 + 0.05 * a} ${sy}) translate(${-ox} ${-CUT_Y})`}>
        <path d={l.d} fill={LIGHT} clipPath={`url(#${top ? 'bt' : 'bb'})`} />
      </g>
    );
  };

  // ---- ACESSIBILIDADE: escrita traço a traço, letra por letra, e pulso único ----
  const pulse = 1 + 0.05 * Math.sin(Math.PI * pr(f, PULSE, PULSE + 12, expoIO));
  const finalText =
    f >= WRITE ? (
      <g transform={`translate(540 960) scale(${pulse}) translate(-540 -960)`}>
        {T2.S5c.lines[0].letters.map((l, i) => {
          const st = WRITE + i * 2;
          if (f < st) return null;
          const draw = pr(f, st, st + 12, expoIO);
          const fill = pr(f, st + 8, st + 16, expoOut);
          return (
            <g key={`c${i}`}>
              <path d={l.d} fill="none" stroke={ACCENT} strokeWidth={5} strokeLinejoin="round" pathLength={1} strokeDasharray={`${draw} 2`} />
              {fill > 0 ? <path d={l.d} fill={ACCENT} transform={`translate(${(l.bb[0] + l.bb[2]) / 2} ${(l.bb[1] + l.bb[3]) / 2}) scale(${fill}) translate(${-(l.bb[0] + l.bb[2]) / 2} ${-(l.bb[1] + l.bb[3]) / 2})`} /> : null}
            </g>
          );
        })}
        <g clipPath="url(#dirClip)">
          {T2.S5c.lines[1].letters.map((l, i) => {
            const st = WRITE + 30 + i * 0.8;
            if (f < st) return null;
            const p = pr(f, st, st + 14);
            return <path key={`d${i}`} d={l.d} fill={LIGHT} transform={`translate(0 ${(1 - p) * l.size * 1.3})`} />;
          })}
        </g>
      </g>
    ) : null;

  // ---- SETA ----
  let ax = 860;
  let ay = 1110;
  let rot = -20;
  let stretch = 1;
  let sc = 1.12;
  // "Sentiu desconforto?": se encolhe e vira o rosto, incomodada
  if (f >= 10 && f < 90) {
    const t = pr(f, 10, 26, expoIO) * (1 - pr(f, 76, 90, expoIO));
    rot = lerp(-20, 40, t);
    stretch = lerp(1, 0.84, t);
    sc = lerp(1.12, 1.02, t);
    ax = lerp(860, 900, t);
    ay = lerp(1110, 1130, t);
  }
  // barreira: vai para perto da palavra e observa; recua surpresa quando ela se parte
  if (f >= 96) {
    const t = pr(f, 96, 112, expoIO);
    ax = lerp(860, 900, t);
    ay = lerp(1110, 1150, t) - 60 * Math.sin(Math.PI * t);
    rot = lerp(-20, -35, t);
    sc = lerp(1.12, 1.4, t);
    if (f >= OPEN) {
      const s2 = Math.sin(Math.PI * pr(f, OPEN, OPEN + 14, expoIO));
      ay -= 40 * s2;
      stretch = 1 + 0.14 * s2;
      rot = -35 + 10 * s2;
    }
  }
  // final: vai para o centro, embaixo da frase, comemora com o pulso e fica viva
  if (f >= C_OUT) {
    const t = pr(f, C_OUT, C_OUT + 24, expoIO);
    ax = lerp(900, 540, t);
    ay = lerp(1150, 1330, t) - 140 * Math.sin(Math.PI * t);
    rot = lerp(-35, -20 - 360, t);
    sc = lerp(1.4, 1.6, t);
    stretch = 1;
    const hop = Math.sin(Math.PI * pr(f, PULSE - 4, PULSE + 12, expoIO));
    ay -= 110 * hop;
    stretch += 0.12 * hop - 0.1 * Math.sin(Math.PI * pr(f, PULSE + 12, PULSE + 18, expoIO));
    // respiração viva até o fim
    if (f > PULSE + 18) {
      const b = Math.sin(((f - PULSE - 18) / 40) * Math.PI * 2);
      ay += 6 * b;
      rot += 4 * b;
      stretch = 1 + 0.03 * b;
    }
  }

  const lineD = `M${lineX1} ${lineY} L${lineX2} ${lineY}`;
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      <defs>
        <clipPath id="aboveLine"><rect x={-100} y={-100} width={1300} height={LINE_Y - 6 + 100} /></clipPath>
        <clipPath id="bt"><rect x={-200} y={-200} width={1480} height={CUT_Y + 200} /></clipPath>
        <clipPath id="bb"><rect x={-200} y={CUT_Y} width={1480} height={2400} /></clipPath>
        <clipPath id="dirClip">
          <rect x={-100} y={T2.S5c.lines[1].bb[1] - 60} width={1300} height={T2.S5c.lines[1].y + 60 - T2.S5c.lines[1].bb[1] + 60} />
        </clipPath>
      </defs>
      <rect width={1080} height={1920} fill={BLUE} />
      {f < A_OUT + 20 ? <RiseFromLine id="S5a" f={f} ins={[A_IN, A_IN + 2]} out={A_OUT} /> : null}
      {f >= B_IN && f < C_OUT + 16 ? (
        <g transform={`translate(0 ${barExit * 900})`}>
          <RiseFromLine id="S5b" f={f} ins={[B_IN, B_IN + 2]} out={1e4} skip={(l) => l.weight === 800 && f >= CRACK} />
          {f >= CRACK ? (split ? <>{BAR.map((l, i) => barLetter(l, i, true))}{BAR.map((l, i) => barLetter(l, i, false))}</> : BAR.map((l, i) => <path key={i} d={l.d} fill={LIGHT} />)) : null}
        </g>
      ) : null}
      {!lineGone ? (
        <>
          <path d={lineD} stroke={LIGHT} strokeWidth={11} strokeLinecap="round" />
          {toYellow > 0 ? <path d={lineD} stroke={ACCENT} strokeWidth={11} strokeLinecap="round" pathLength={1} strokeDasharray={`${toYellow} 2`} /> : null}
        </>
      ) : null}
      {finalText}
      <RubberArrow x={ax} y={ay} rot={rot} scale={sc} rig={{stretch}} fill={ACCENT} />
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
