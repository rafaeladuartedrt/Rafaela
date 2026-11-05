import React from 'react';
import {AbsoluteFill, useCurrentFrame, Easing} from 'remotion';
import {BLUE, LIGHT, ACCENT, RubberArrow, Question, Burst} from './kit';

const io = Easing.bezier(0.65, 0, 0.35, 1);
const outQ = Easing.bezier(0.22, 1, 0.36, 1);
const inQ = Easing.bezier(0.7, 0, 0.84, 0);
const cl = (v: number) => Math.min(1, Math.max(0, v));
const pr = (f: number, a: number, b: number, e = io) => e(cl((f - a) / (b - a)));
const jelly = (f: number, s: number, amp = 1, decay = 6, freq = 0.9) => (f < s ? 0 : amp * Math.exp(-(f - s) / decay) * Math.sin((f - s) * freq));

// Profundidade: a seta se afasta e se aproxima da tela; ao encostar na câmera, cobre o quadro e troca a cor do fundo
export const DepthPreview: React.FC = () => {
  const f = useCurrentFrame();
  // z = distância da câmera (1 = normal, >1 longe, <1 perto)
  let z: number;
  if (f < 30) z = 4.5 - 3.2 * pr(f, 0, 30, outQ); // vem do fundo, curiosa
  else if (f < 44) z = 1.3 + 1.4 * pr(f, 30, 44, outQ); // recua, tímida
  else if (f < 62) z = 2.7 - 2.66 * pr(f, 46, 62, inQ); // dispara contra a câmera
  else if (f < 70) z = 0.04; // laranja cobre a tela: troca o fundo
  else z = 0.04 + 0.96 * pr(f, 70, 92, outQ); // se afasta revelando a cena nova
  const scale = 2.3 / z;
  const bg = f < 66 ? BLUE : LIGHT;
  // ponto de fuga levemente acima do centro; perto da câmera a ponta da seta mira o centro do quadro
  const x = 540 + (f < 62 ? 50 * Math.sin(f * 0.15) / z : 0);
  const y = 960 + 40 * Math.min(1 / z, 2);
  const stretch = f >= 46 && f < 62 ? 1 + 0.2 * pr(f, 46, 56) : 1 + jelly(f, 92, 0.16, 5, 1.1);
  const bend = f < 30 ? 0.25 * Math.sin(f * 0.25) : f < 44 ? -0.3 * pr(f, 30, 40) : 0;
  const rot = f < 44 ? 8 * Math.sin(f * 0.2) : f < 70 ? -8 * pr(f, 46, 62) : -8 + 8 * pr(f, 70, 92);
  return (
    <AbsoluteFill style={{backgroundColor: bg}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <rect width={1080} height={1920} fill={bg} />
        {f >= 34 && f < 46 ? <Question x={x + 120} y={y - 200 / z} c={ACCENT} s={1.4 / z} rot={10} /> : null}
        {f >= 92 && f < 104 ? <Burst x={x} y={y - 120} r={150} n={5} c={BLUE} a0={-90} spread={150} len={40} /> : null}
        <RubberArrow x={x} y={y} rot={rot} scale={scale} rig={{stretch, bend, phase: f * 0.5}} />
      </svg>
    </AbsoluteFill>
  );
};
