import React from 'react';
import {AbsoluteFill, useCurrentFrame, spring, Easing} from 'remotion';
import {BLUE, LIGHT, ORANGE, st, RubberArrow, Burst, Question, Scribble, Speed} from './kit';

const io = Easing.bezier(0.65, 0, 0.35, 1);
const outQ = Easing.bezier(0.22, 1, 0.36, 1);
const inQ = Easing.bezier(0.55, 0, 1, 0.45);
const cl = (v: number) => Math.min(1, Math.max(0, v));
const pr = (f: number, a: number, b: number, e = io) => e(cl((f - a) / (b - a)));
const sp = (f: number, s: number, damping = 8, stiffness = 160) => (f < s ? 0 : spring({frame: f - s, fps: 30, config: {damping, stiffness, mass: 1}}));
// gelatina: oscilação amortecida a partir de um impacto
const jelly = (f: number, s: number, amp = 1, decay = 6, freq = 0.9) => (f < s ? 0 : amp * Math.exp(-(f - s) / decay) * Math.sin((f - s) * freq));
const SC = 2.3; // seta maior

const Label: React.FC<{t: string}> = ({t}) => (
  <text x={540} y={1430} textAnchor="middle" fill={LIGHT} fontFamily="Inter" fontWeight={600} fontSize={56}>{t}</text>
);

export const ArrowActing: React.FC = () => {
  const f = useCurrentFrame();
  let x = 540, y = 960, rot = 0, stretch = 1, bend = 0, bulge = 0, wobble = 0, phase = f * 0.5, scale = SC;
  const fx: React.ReactNode[] = [];
  let label = '';

  if (f < 42) {
    // CURIOSA: se estica para espiar, curva o corpo na direção do que viu, volta com balanço
    label = 'curiosa';
    const up = pr(f, 4, 18, outQ) - pr(f, 28, 36, inQ);
    stretch = 1 + 0.32 * up + jelly(f, 36, 0.12, 5, 1.1);
    bend = 0.45 * up;
    rot = -10 * up;
    y = 960 - 40 * up;
    bulge = -0.15 * up;
    if (up > 0.6) fx.push(<Burst key="b" x={x - 40} y={y - 190} r={40} n={3} c={ORANGE} a0={-100} spread={70} len={36} />);
  } else if (f < 88) {
    // PERDIDA: encolhe, murcha, gira devagar procurando, corpo bamboleia
    label = 'perdida';
    const g = f - 42;
    scale = SC * (1 - 0.15 * pr(f, 42, 50, outQ));
    stretch = 0.86;
    rot = 30 * Math.sin(g * 0.16) + 200 * pr(f, 56, 80, io);
    bend = 0.4 * Math.sin(g * 0.22);
    wobble = 0.25;
    x = 540 + 60 * Math.sin(g * 0.11);
    fx.push(<Question key="q1" x={430} y={760 + 6 * Math.sin(g * 0.3)} c={ORANGE} s={1.3} rot={-12} />);
    if (g > 14) fx.push(<Question key="q2" x={660} y={740 + 6 * Math.cos(g * 0.3)} c={ORANGE} s={0.9} rot={14} />);
  } else if (f < 134) {
    // FRUSTRADA: antecipa, avança, bate na parede, amassa, treme de raiva e murcha
    label = 'frustrada';
    fx.push(<path key="w" d="M820 760 L820 1160" {...st(LIGHT)} />);
    const back = pr(f, 88, 98, io);
    const go = pr(f, 98, 104, inQ);
    const hit = f >= 104;
    rot = 110;
    x = 520 - 60 * back + 210 * go;
    stretch = 1 + 0.18 * back - 0.1 * back + (f >= 98 && f < 104 ? 0.3 * go : 0);
    if (hit) {
      const k = pr(f, 104, 108, outQ) - 0.6 * pr(f, 112, 124, io);
      stretch = 1 - 0.3 * k + jelly(f, 112, 0.14, 4, 1.3);
      bulge = 0.45 * k;
      x = 730 - 40 * pr(f, 112, 124, outQ) + 4 * Math.sin(f * 2.1) * (f < 120 ? 1 : 0);
      scale = SC * (1 - 0.12 * pr(f, 122, 132));
      bend = -0.2 * pr(f, 122, 132);
      fx.push(<Burst key="i" x={815} y={960} r={30} n={7} c={ORANGE} a0={180} spread={150} len={44} />);
      if (f > 110) fx.push(<Scribble key="s" x={680} y={790 + 4 * Math.sin(f * 1.7)} c={ORANGE} s={1.3} />);
    }
    if (!hit && go > 0) fx.push(<Speed key="sp" x={x - 120} y={y} c={ORANGE} len={110} ang={180} />);
  } else if (f < 180) {
    // ALEGRE: quica com amassada no chão, estica no ar, dá uma pirueta, treme feliz
    label = 'alegre';
    const g = f - 134;
    const T = 15;
    const ph = (g % T) / T;
    const hop = Math.sin(Math.PI * ph);
    y = 1080 - 220 * hop;
    stretch = ph < 0.12 || ph > 0.88 ? 0.7 : 1 + 0.25 * hop;
    bulge = ph < 0.12 || ph > 0.88 ? 0.35 : 0;
    rot = g >= 15 && g < 30 ? 360 * io(ph) : 0;
    wobble = 0.15 * Math.sin(g * 0.9);
    fx.push(<path key="g" d="M380 1180 L700 1180" {...st(LIGHT)} />);
    if (ph < 0.15) fx.push(<Burst key="j" x={540} y={1160} r={70} n={5} c={ORANGE} a0={-90} spread={160} len={30} />);
  } else {
    // CONTENTE: balança tranquila, respira, curva de um lado para o outro
    label = 'contente';
    const g = f - 180;
    bend = 0.3 * Math.sin(g * 0.18);
    rot = -6 * Math.sin(g * 0.18);
    bulge = 0.08 + 0.06 * Math.sin(g * 0.3);
    stretch = 1 + 0.05 * Math.sin(g * 0.3);
    y = 960 + 6 * Math.sin(g * 0.3);
  }
  return (
    <AbsoluteFill style={{backgroundColor: BLUE}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <rect width={1080} height={1920} fill={BLUE} />
        {fx}
        <RubberArrow x={x} y={y} rot={rot} scale={scale} rig={{stretch, bend, bulge, wobble, phase}} />
        <Label t={label} />
      </svg>
    </AbsoluteFill>
  );
};
