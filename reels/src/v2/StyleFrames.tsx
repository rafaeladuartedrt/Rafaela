import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BLUE, LIGHT, ORANGE, SW, st, Words, T2, Arrow2, Burst, Question, Scribble, Sparkle, Drop, Speed, Phone, PHONE, STAIRS3, RAMP3, lineD} from './kit';

const hs = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};
const Bg: React.FC<{c: string}> = ({c}) => <rect x={0} y={0} width={1080} height={1920} fill={c} />;
const ADBadge: React.FC<{x: number; y: number; c: string; s?: number}> = ({x, y, c, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <Words id="ad" fn={() => ({color: c})} />
    {[18, 32, 46].map((r, i) => (
      <path key={i} d={`M${100 + r * Math.cos(-0.85)} ${-22 + r * Math.sin(-0.85)} A${r} ${r} 0 0 1 ${100 + r * Math.cos(0.85)} ${-22 + r * Math.sin(0.85)}`} {...st(c, 6)} />
    ))}
  </g>
);
const Button: React.FC<{x: number; y: number; filled: boolean; label: 'seg' | 'segd'; c: string; bg: string}> = ({x, y, filled, label, c, bg}) => {
  const w = T2[label].lines[0].bb[2] + 70;
  return (
    <g transform={`translate(${x - w / 2} ${y})`}>
      <rect x={0} y={-48} width={w} height={96} rx={48} {...st(c, SW, filled ? c : bg)} />
      <g transform="translate(35 22)">
        <Words id={label} fn={() => ({color: filled ? bg : c})} />
      </g>
    </g>
  );
};

const frames: React.FC[] = [
  // 1. GANCHO: celular com foto de pessoas, seta curiosa, "MUDAR." em peso máximo
  () => (
    <>
      <Bg c={BLUE} />
      <Phone c={LIGHT} bg={BLUE} />
      <Words id="s1a" />
      <Words id="s1b" fn={(l, gi) => ({dy: gi === 5 ? -14 : 0, rot: gi === 0 ? -4 : 0})} />
      <Arrow2 x={640} y={1010} rot={-16} sx={0.88} sy={1.16} />
      <Burst x={600} y={940} r={62} n={3} c={ORANGE} a0={-90} spread={80} len={30} />
    </>
  ),
  // 2. VISÃO (problema): fundo invertido, foto desfocada, letras saindo do eixo e da tela, seta perdida
  () => (
    <>
      <Bg c={LIGHT} />
      <defs>
        <filter id="blurA" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={11} /></filter>
        <filter id="blurB" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={4} /></filter>
      </defs>
      <g filter="url(#blurA)"><Phone c={BLUE} bg={LIGHT} /></g>
      <Words id="s2a" fn={(l, gi, li) => (li === 0 ? {dx: [-190, -40, 30, 90, 240][gi], dy: [40, -30, 60, -50, 20][gi], rot: [-14, 9, -6, 12, 18][gi], sx: 1.15, sy: 1.15} : {})} />
      <g filter="url(#blurB)"><Words id="s2a" fn={(l, gi, li) => (li === 0 ? {hide: true} : {dx: hs(gi) * 6})} /></g>
      <Arrow2 x={560} y={1040} rot={150} scale={0.8} />
      <Question x={470} y={940} c={BLUE} rot={-12} />
      <Question x={660} y={920} c={BLUE} s={0.7} rot={14} />
      <Drop x={640} y={1000} c={BLUE} s={0.8} />
    </>
  ),
  // 3. VISÃO (solução): palavra-chave em laranja e caixa alta, foto nítida com selo AD, seta feliz
  () => (
    <>
      <Bg c={BLUE} />
      <Phone c={LIGHT} bg={BLUE} />
      <ADBadge x={PHONE.x + 64} y={PHONE.y + 140} c={LIGHT} s={0.9} />
      <circle cx={PHONE.x + 124} cy={PHONE.y + 120} r={96} {...st(ORANGE, 5)} />
      <Words id="s2b" />
      <Arrow2 x={880} y={1120} rot={-24} sx={0.86} sy={1.2} />
      <Sparkle x={820} y={1000} c={ORANGE} s={0.9} />
      <Sparkle x={930} y={1020} c={ORANGE} s={0.6} />
      <Burst x={870} y={1040} r={70} n={4} c={ORANGE} a0={-90} spread={120} len={26} />
    </>
  ),
  // 4. AUDIÇÃO: só "conversa" vira linha e some, junto com a onda achatando
  () => (
    <>
      <Bg c={LIGHT} />
      <Words id="s3a" fn={(l, gi, li) => (li === 1 && l.word === 1 ? {sy: 0.12, sx: 1.08, oy: l.y - 30} : {})} />
      <path d="M140 960 C240 950 300 975 380 960 C460 945 520 972 600 960 C700 948 760 968 940 960" {...st(BLUE)} />
      <g transform="translate(560 760)">
        <path d="M-58 -20 L-30 -20 L2 -48 L2 48 L-30 20 L-58 20 Z" {...st(BLUE)} />
        <path d="M26 -24 L72 24 M72 -24 L26 24" {...st(BLUE)} />
      </g>
      <Arrow2 x={760} y={1130} rot={8} sx={1.12} sy={0.82} />
      <Burst x={740} y={1060} r={70} n={3} c={BLUE} a0={-100} spread={70} len={28} />
    </>
  ),
  // 5. MOBILIDADE (problema): escada grande de 3 degraus, seta amassada no impacto, irritada
  () => (
    <>
      <Bg c={LIGHT} />
      <Words id="s4a" />
      <path d={lineD(STAIRS3)} {...st(BLUE, 9)} />
      <Button x={810} y={880} filled={false} label="seg" c={BLUE} bg={LIGHT} />
      <Arrow2 x={196} y={1318} rot={-6} sx={0.72} sy={1.14} scale={1.6} />
      <Burst x={250} y={1300} r={40} n={7} c={BLUE} a0={-150} spread={150} len={40} />
      <Scribble x={150} y={1090} c={BLUE} s={1.5} />
      <Speed x={110} y={1330} c={BLUE} len={70} ang={180} />
    </>
  ),
  // 6. MOBILIDADE (solução): a própria linha do degrau vira rampa, seta sobe contente, botão "Seguindo"
  () => (
    <>
      <Bg c={BLUE} />
      <Words id="s4b" />
      <path d={lineD(RAMP3)} {...st(LIGHT, 9)} />
      <Button x={810} y={880} filled label="segd" c={LIGHT} bg={BLUE} />
      <Arrow2 x={600} y={960} rot={-30} sx={0.9} sy={1.12} scale={1.2} />
      <Sparkle x={520} y={860} c={ORANGE} />
      <Sparkle x={660} y={830} c={ORANGE} s={0.6} />
      <Speed x={520} y={1060} c={ORANGE} len={80} ang={145} />
    </>
  ),
  // 7. VIRADA: "barreira" se parte na divisão silábica correta (bar-rei-ra) e a seta passa pela abertura
  () => (
    <>
      <Bg c={BLUE} />
      <Words id="s5x" fn={(l, gi, li) => {
        if (li === 1 && l.weight !== 800) return {dx: -40};
        if (li !== 1 || l.weight !== 800) return {};
        const heavy = T2.s5x.lines[1].letters.filter((x) => x.weight === 800);
        const k = heavy.indexOf(l);
        const left = k < 3;
        const ox = (heavy[2].bb[2] + heavy[3].bb[0]) / 2;
        return left ? {dx: -38, rot: -7, ox, oy: l.y} : {dx: 40, rot: 7, ox, oy: l.y};
      }} />
      {(() => { const h = T2.s5x.lines[1].letters.filter((x) => x.weight === 800); const m = (h[2].bb[2] + h[3].bb[0]) / 2; return <path d={`M${m} 440 L${m - 16} 480 L${m + 12} 515 L${m - 12} 555 L${m + 8} 600`} {...st(ORANGE, 6)} />; })()}
      <Arrow2 x={600} y={760} rot={-90} sx={1.2} sy={0.85} />
      <Speed x={540} y={760} c={ORANGE} len={110} ang={90} />
    </>
  ),
  // 8. FINAL: só o texto em destaque no meio e a seta viva
  () => (
    <>
      <Bg c={BLUE} />
      <Words id="s5b" />
      <Arrow2 x={540} y={1210} rot={-10} sx={0.9} sy={1.14} scale={1.1} />
      <Sparkle x={460} y={1120} c={ORANGE} s={0.8} />
      <Sparkle x={630} y={1100} c={ORANGE} s={0.55} />
      <path d="M470 1310 Q540 1330 610 1310" {...st(ORANGE, 6)} />
    </>
  ),
];

export const StyleFrames: React.FC = () => {
  const f = useCurrentFrame();
  const F = frames[f] ?? frames[0];
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <F />
      </svg>
    </AbsoluteFill>
  );
};
