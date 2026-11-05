import React from 'react';
import data from './textData.json';

// Paleta v2
export const BLUE = '#280A96';
export const LIGHT = '#D7EDE3';
export const ORANGE = '#FF8A1F';
export const SW = 7;
export const COLORS: Record<string, string> = {B: BLUE, L: LIGHT, O: ORANGE};

export const st = (c: string, w = SW, fill = 'none') => ({
  stroke: c, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill, vectorEffect: 'non-scaling-stroke' as const,
});

// ---------- TEXTO ----------
export type L2 = {ch: string; d: string; x: number; y: number; size: number; weight: number; color: string; len: number; word: number; bb: number[]};
export const T2 = data as unknown as Record<string, {lines: {y: number; letters: L2[]; bb: number[]; text: string}[]}>;
export type LS2 = {dx?: number; dy?: number; rot?: number; sx?: number; sy?: number; ox?: number; oy?: number; color?: string; hide?: boolean; outline?: number};
export const Words: React.FC<{id: string; fn?: (l: L2, gi: number, li: number) => LS2; swap?: Record<string, string>}> = ({id, fn, swap}) => {
  let gi = 0;
  return (
    <g>
      {T2[id].lines.map((line, li) =>
        line.letters.map((l) => {
          const s = fn ? fn(l, gi, li) : {};
          gi++;
          if (s.hide) return null;
          const ox = s.ox ?? (l.bb[0] + l.bb[2]) / 2;
          const oy = s.oy ?? l.y - l.size * 0.35;
          const c = s.color ?? COLORS[swap?.[l.color] ?? l.color];
          return (
            <path
              key={`${li}-${gi}`}
              d={l.d}
              transform={`translate(${ox + (s.dx ?? 0)} ${oy + (s.dy ?? 0)}) rotate(${s.rot ?? 0}) scale(${s.sx ?? 1} ${s.sy ?? 1}) translate(${-ox} ${-oy})`}
              fill={s.outline ? 'none' : c}
              stroke={s.outline ? c : 'none'}
              strokeWidth={s.outline ?? 0}
              strokeLinejoin="round"
            />
          );
        }),
      )}
    </g>
  );
};

// ---------- SETA (personagem) ----------
// Sempre seta. Laranja chapada com contorno azul: legível sobre fundo azul (5,7:1) e sobre fundo claro (contorno).
const S = 1.6;
export const ARROW_D = `M0 0 L0 ${76 * S} L${19 * S} ${58 * S} L${31 * S} ${87 * S} L${45 * S} ${81 * S} L${33 * S} ${53 * S} L${57 * S} ${53 * S} Z`;
export const PIV: [number, number] = [25 * S, 45 * S];
export const Arrow2: React.FC<{x: number; y: number; rot?: number; sx?: number; sy?: number; skew?: number; scale?: number}> = ({x, y, rot = 0, sx = 1, sy = 1, skew = 0, scale = 1}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) skewX(${skew}) scale(${sx * scale} ${sy * scale}) translate(${-PIV[0]} ${-PIV[1]})`}>
    <path d={ARROW_D} fill={ORANGE} stroke={BLUE} strokeWidth={SW} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
  </g>
);

// Traços de destaque (expressões), desenhados em volta da seta
export const Burst: React.FC<{x: number; y: number; r?: number; n?: number; c: string; a0?: number; spread?: number; len?: number}> = ({x, y, r = 70, n = 7, c, a0 = 0, spread = 360, len = 34}) => (
  <g>
    {Array.from({length: n}, (_, i) => {
      const a = ((a0 + (spread === 360 ? (i * 360) / n : -spread / 2 + (i * spread) / (n - 1))) * Math.PI) / 180;
      return <path key={i} d={`M${x + Math.cos(a) * r} ${y + Math.sin(a) * r} L${x + Math.cos(a) * (r + len)} ${y + Math.sin(a) * (r + len)}`} {...st(c, 8)} />;
    })}
  </g>
);
export const Question: React.FC<{x: number; y: number; s?: number; c: string; rot?: number}> = ({x, y, s = 1, c, rot = 0}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <path d="M-18 -22 C-18 -44 18 -46 18 -22 C18 -6 0 -4 0 12" {...st(c, 8)} />
    <circle cx={0} cy={32} r={6} fill={c} />
  </g>
);
export const Scribble: React.FC<{x: number; y: number; s?: number; c: string}> = ({x, y, s = 1, c}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-46 6 C-56 -20 -20 -34 -8 -14 C-4 -40 34 -38 30 -10 C56 -16 58 20 30 18 C34 40 -2 42 -6 20 C-24 40 -60 30 -46 6 Z" {...st(c, 7)} />
    <path d="M-22 -4 L-6 8 M-6 -4 L-22 8 M8 -4 L24 8 M24 -4 L8 8" {...st(c, 6)} />
  </g>
);
export const Sparkle: React.FC<{x: number; y: number; s?: number; c: string}> = ({x, y, s = 1, c}) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -26 C4 -6 6 -4 26 0 C6 4 4 6 0 26 C-4 6 -6 4 -26 0 C-6 -4 -4 -6 0 -26 Z" fill={c} />
);
export const Drop: React.FC<{x: number; y: number; s?: number; c: string}> = ({x, y, s = 1, c}) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -22 C10 -6 16 2 16 10 C16 20 8 26 0 26 C-8 26 -16 20 -16 10 C-16 2 -10 -6 0 -22 Z" {...st(c, 6)} />
);
export const Speed: React.FC<{x: number; y: number; c: string; n?: number; len?: number; ang?: number}> = ({x, y, c, n = 3, len = 90, ang = 180}) => {
  const a = (ang * Math.PI) / 180;
  return (
    <g>
      {Array.from({length: n}, (_, i) => {
        const o = (i - (n - 1) / 2) * 26;
        const px = x - Math.sin(a) * o;
        const py = y + Math.cos(a) * o;
        const l = len * (i === 1 ? 1 : 0.65);
        return <path key={i} d={`M${px} ${py} L${px + Math.cos(a) * l} ${py + Math.sin(a) * l}`} {...st(c, 7)} />;
      })}
    </g>
  );
};

// ---------- PESSOAS (traço único, mesma estética) ----------
// Pés em y=0, altura ~215. Rosto simples e gentil. Variantes de deficiência desenhadas com respeito.
const Head: React.FC<{c: string; bg: string; glasses?: boolean; y?: number}> = ({c, bg, glasses, y = -178}) => (
  <g>
    <circle cx={0} cy={y} r={36} {...st(c, SW, bg)} />
    {glasses ? (
      <g>
        <circle cx={-14} cy={y - 4} r={11} fill={c} />
        <circle cx={14} cy={y - 4} r={11} fill={c} />
        <path d={`M-3 ${y - 5} L3 ${y - 5}`} {...st(c, 5)} />
      </g>
    ) : (
      <g>
        <circle cx={-12} cy={y - 4} r={4} fill={c} />
        <circle cx={12} cy={y - 4} r={4} fill={c} />
      </g>
    )}
    <path d={`M-11 ${y + 12} Q0 ${y + 20} 11 ${y + 12}`} {...st(c, 5)} />
  </g>
);
const Torso: React.FC<{c: string; bg: string; y0?: number; y1?: number}> = ({c, bg, y0 = -138, y1 = -64}) => (
  <path d={`M-18 ${y0} L18 ${y0} Q24 ${y0} 25 ${y0 + 8} L30 ${y1} L-30 ${y1} L-25 ${y0 + 8} Q-24 ${y0} -18 ${y0} Z`} {...st(c, SW, bg)} />
);
export const Person: React.FC<{kind: 'wheel' | 'cane' | 'dog' | 'crutch'; c: string; bg: string}> = ({kind, c, bg}) => {
  if (kind === 'wheel')
    return (
      <g>
        <path d="M-40 -142 L-44 -60 L30 -60" {...st(c)} />
        <circle cx={-6} cy={-46} r={46} {...st(c, SW, bg)} />
        {[0, 45, 90, 135].map((a) => (
          <path key={a} d={`M${-6 + 40 * Math.cos((a * Math.PI) / 180)} ${-46 + 40 * Math.sin((a * Math.PI) / 180)} L${-6 - 40 * Math.cos((a * Math.PI) / 180)} ${-46 - 40 * Math.sin((a * Math.PI) / 180)}`} {...st(c, 4)} />
        ))}
        <circle cx={-6} cy={-46} r={6} fill={c} />
        <circle cx={46} cy={-8} r={8} {...st(c, 6, bg)} />
        <path d="M30 -60 L46 -16" {...st(c, 6)} />
        <Head c={c} bg={bg} y={-196} />
        <Torso c={c} bg={bg} y0={-158} y1={-92} />
        <path d="M-20 -92 L34 -92 L40 -24 M10 -92 L18 -26 M40 -24 L54 -22 M18 -26 L30 -24" {...st(c)} />
        <path d="M22 -146 L44 -110 L58 -110" {...st(c)} />
      </g>
    );
  const legs = <path d="M-12 -64 L-16 -4 L-30 -2 M12 -64 L16 -4 L30 -2" {...st(c)} />;
  if (kind === 'cane')
    return (
      <g>
        {legs}
        <Torso c={c} bg={bg} />
        <Head c={c} bg={bg} glasses />
        <path d="M-22 -128 L-38 -84" {...st(c)} />
        <path d="M22 -128 L42 -90" {...st(c)} />
        <path d="M42 -92 L92 0" {...st(c, 6)} />
      </g>
    );
  if (kind === 'dog')
    return (
      <g>
        {legs}
        <Torso c={c} bg={bg} />
        <Head c={c} bg={bg} glasses />
        <path d="M-22 -128 L-38 -84" {...st(c)} />
        <path d="M22 -128 L50 -96 L78 -96" {...st(c)} />
        {/* cão-guia com guia rígida */}
        <path d="M78 -96 L96 -58" {...st(c, 6)} />
        <path d="M84 -56 Q120 -64 150 -56 L152 -30 Q120 -24 86 -30 Z" {...st(c, SW, bg)} />
        <path d="M150 -58 Q160 -86 178 -78 Q192 -72 186 -58 Q176 -50 156 -52" {...st(c, SW, bg)} />
        <path d="M170 -80 Q166 -64 160 -66" {...st(c, 5)} />
        <circle cx={180} cy={-70} r={3.5} fill={c} />
        <path d="M94 -30 L92 0 M112 -28 L112 0 M132 -28 L134 0 M148 -30 L150 0 M86 -50 Q72 -60 68 -76" {...st(c, 6)} />
        <path d="M96 -58 L120 -58" {...st(c, 9)} />
      </g>
    );
  return (
    <g>
      {legs}
      <path d="M-44 -100 L-52 0 M44 -100 L52 0 M-44 -100 L-30 -104 M44 -100 L30 -104" {...st(c, 6)} />
      <Torso c={c} bg={bg} />
      <Head c={c} bg={bg} />
      <path d="M-22 -128 L-40 -96 M22 -128 L40 -96" {...st(c)} />
    </g>
  );
};

// ---------- CELULAR COM POST ----------
export const PHONE = {x: 270, y: 640, w: 540, h: 840, rx: 72};
export const Phone: React.FC<{c: string; bg: string; people?: boolean; children?: React.ReactNode}> = ({c, bg, people = true, children}) => {
  const {x, y, w, h, rx} = PHONE;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={rx} {...st(c, SW, bg)} />
      <rect x={x + 22} y={y + 22} width={w - 44} height={h - 44} rx={rx - 20} {...st(c, 4, bg)} />
      <rect x={x + w / 2 - 50} y={y + 40} width={100} height={22} rx={11} fill={c} />
      {/* interface do post */}
      <path d={`M${x + 52} ${y + h - 70} L${x + w - 52} ${y + h - 70}`} {...st(c, 5)} />
      <circle cx={x + 170} cy={y + h - 70} r={10} fill={c} />
      {[0, 1, 2].map((i) => {
        const ix = x + w - 74;
        const iy = y + 210 + i * 104;
        if (i === 0) return <path key={i} transform={`translate(${ix} ${iy}) scale(0.85)`} d="M0 26 C-14 14 -36 0 -36 -14 C-36 -28 -24 -36 -13 -36 C-6 -36 -2 -32 0 -26 C2 -32 6 -36 13 -36 C24 -36 36 -28 36 -14 C36 0 14 14 0 26 Z" {...st(c)} />;
        if (i === 1) return <path key={i} transform={`translate(${ix} ${iy}) scale(0.85)`} d="M-18 25 C-31 18 -38 9 -38 -3 C-38 -20 -21 -32 0 -32 C21 -32 38 -20 38 -3 C38 15 21 27 0 27 C-5 27 -10 26 -14 25 L-32 36 Z" {...st(c)} />;
        return <path key={i} transform={`translate(${ix} ${iy}) scale(0.85)`} d="M-36 -2 L36 -32 L12 34 L1 8 Z M1 8 L36 -32" {...st(c)} />;
      })}
      {people ? <People c={c} bg={bg} /> : null}
      {children}
    </g>
  );
};
export const People: React.FC<{c: string; bg: string}> = ({c, bg}) => (
  <g>
    {/* sol e chão da foto */}
    <circle cx={PHONE.x + 300} cy={PHONE.y + 150} r={36} fill={c} />
    <path d={`M${PHONE.x + 44} ${PHONE.y + 470} L${PHONE.x + PHONE.w - 120} ${PHONE.y + 470}`} {...st(c, 5)} />
    <path d={`M${PHONE.x + 44} ${PHONE.y + 720} L${PHONE.x + PHONE.w - 44} ${PHONE.y + 720}`} {...st(c, 5)} />
    <g transform={`translate(${PHONE.x + 140} ${PHONE.y + 470}) scale(0.9)`}><Person kind="wheel" c={c} bg={bg} /></g>
    <g transform={`translate(${PHONE.x + 300} ${PHONE.y + 470}) scale(0.9)`}><Person kind="cane" c={c} bg={bg} /></g>
    <g transform={`translate(${PHONE.x + 100} ${PHONE.y + 720}) scale(0.9)`}><Person kind="dog" c={c} bg={bg} /></g>
    <g transform={`translate(${PHONE.x + 390} ${PHONE.y + 720}) scale(0.9)`}><Person kind="crutch" c={c} bg={bg} /></g>
  </g>
);

// ---------- ESCADA DE 3 DEGRAUS (grande) ----------
export const STAIRS3: [number, number][] = [[60, 1400], [250, 1400], [250, 1250], [470, 1250], [470, 1100], [690, 1100], [690, 950], [930, 950]];
// a mesma linha transformada em rampa (mesmo número de pontos)
export const RAMP3: [number, number][] = [[60, 1400], ...[1, 2, 3, 4, 5].map((k) => [60 + (630 * k) / 6, 1400 - (450 * k) / 6] as [number, number]), [690, 950], [930, 950]];
export const lineD = (P: [number, number][]) => P.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('');
