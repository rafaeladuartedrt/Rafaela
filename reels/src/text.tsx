import React from 'react';
import data from './textData.json';
import {FG, Hatch, hatchFill, clamp} from './lib';

export type Letter = {ch: string; d: string; x: number; w: number; y: number; size: number; weight: string; len: number; word: number; bb: number[]};
export type Line = {y: number; letters: Letter[]; bb: number[]; text: string};
export type PhraseData = {lines: Line[]; words: number};
export const T = data as unknown as Record<string, PhraseData>;

export type LS = {
  dx?: number;
  dy?: number;
  rot?: number;
  sx?: number;
  sy?: number;
  ox?: number; // origem da transformação (absoluta)
  oy?: number;
  fillW?: number; // espessura da hachura (>= spacing = sólido)
  spacing?: number;
  angle?: number;
  sw?: number; // traço de contorno
  dash?: string;
  dashOffset?: number;
  color?: string; // FG ou BG (botão preenchido)
  hide?: boolean;
};

export const cx = (l: Letter) => (l.bb[0] + l.bb[2]) / 2;
export const capMid = (l: Letter) => l.y - l.size * 0.334;

type Fn = (l: Letter, i: number, li: number, line: Line, gi: number) => LS;

// Renderiza uma frase letra a letra. clip = máscara por linha (entrada/saída por máscara).
export const Phrase: React.FC<{id: string; fn: Fn; clip?: boolean; uid: string; transform?: string}> = ({id, fn, clip = true, uid, transform}) => {
  const P = T[id];
  let gi = 0;
  const defs: React.ReactNode[] = [];
  const seen = new Set<string>();
  const lines = P.lines.map((line, li) => {
    const letters = line.letters.map((l, i) => {
      const s = fn(l, i, li, line, gi++);
      if (s.hide) return null;
      const ox = s.ox ?? cx(l);
      const oy = s.oy ?? capMid(l);
      const tr = `translate(${(ox + (s.dx ?? 0)).toFixed(2)} ${(oy + (s.dy ?? 0)).toFixed(2)}) rotate(${(s.rot ?? 0).toFixed(2)}) scale(${(s.sx ?? 1).toFixed(4)} ${(s.sy ?? 1).toFixed(4)}) translate(${-ox} ${-oy})`;
      const spacing = s.spacing ?? 9;
      const fw = s.fillW ?? 999;
      let fill: string = s.color ?? FG;
      if (fw < spacing - 0.01) {
        const hid = `${uid}-h-${Math.round(fw * 4)}-${spacing}-${s.angle ?? 45}`;
        if (!seen.has(hid)) {
          seen.add(hid);
          defs.push(<Hatch key={hid} id={hid} weight={fw} spacing={spacing} angle={s.angle ?? 45} />);
        }
        fill = hatchFill(hid, fw, spacing);
      }
      const sw = s.sw ?? 0;
      return (
        <path
          key={i}
          d={l.d}
          transform={tr}
          fill={fill}
          stroke={sw > 0.05 ? s.color ?? FG : 'none'}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={s.dash}
          strokeDashoffset={s.dashOffset}
        />
      );
    });
    const top = line.bb[1] - 40;
    const bottom = line.y + line.letters[0].size * 0.36;
    return (
      <g key={li}>
        {clip ? (
          <>
            <clipPath id={`${uid}-c${li}`}>
              <rect x={-200} y={top} width={1480} height={bottom - top} />
            </clipPath>
            <g clipPath={`url(#${uid}-c${li})`}>{letters}</g>
          </>
        ) : (
          letters
        )}
      </g>
    );
  });
  return (
    <g transform={transform}>
      <defs>{defs}</defs>
      {lines}
    </g>
  );
};

// Entrada por máscara: a letra sobe de baixo da linha de base. p 0..1 (aceita overshoot)
export const maskIn = (p: number, l: Letter) => (1 - p) * l.size * 1.15;
export const maskOut = (p: number, l: Letter) => clamp(p) * l.size * 1.15;
