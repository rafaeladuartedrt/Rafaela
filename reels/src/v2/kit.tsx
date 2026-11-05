import React from 'react';
import data from './textData.json';

// Paleta v2
export const BLUE = '#280A96';
export const LIGHT = '#D7EDE3';
// cor de destaque: amarelo (9,2:1 sobre o azul)
export const ACCENT = '#FFD23F';
export const SW = 11; // traço mais grosso (v2)
export const COLORS: Record<string, string> = {B: BLUE, L: LIGHT, O: ACCENT};

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
    <path d={ARROW_D} fill={ACCENT} stroke={BLUE} strokeWidth={SW} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
  </g>
);

// Traços de destaque (expressões), desenhados em volta da seta
export const Burst: React.FC<{x: number; y: number; r?: number; n?: number; c: string; a0?: number; spread?: number; len?: number}> = ({x, y, r = 70, n = 7, c, a0 = 0, spread = 360, len = 34}) => (
  <g>
    {Array.from({length: n}, (_, i) => {
      const a = ((a0 + (spread === 360 ? (i * 360) / n : -spread / 2 + (i * spread) / (n - 1))) * Math.PI) / 180;
      return <path key={i} d={`M${x + Math.cos(a) * r} ${y + Math.sin(a) * r} L${x + Math.cos(a) * (r + len)} ${y + Math.sin(a) * (r + len)}`} {...st(c, 12)} />;
    })}
  </g>
);
export const Question: React.FC<{x: number; y: number; s?: number; c: string; rot?: number}> = ({x, y, s = 1, c, rot = 0}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <path d="M-18 -22 C-18 -44 18 -46 18 -22 C18 -6 0 -4 0 12" {...st(c, 12)} />
    <circle cx={0} cy={32} r={6} fill={c} />
  </g>
);
export const Scribble: React.FC<{x: number; y: number; s?: number; c: string}> = ({x, y, s = 1, c}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-46 6 C-56 -20 -20 -34 -8 -14 C-4 -40 34 -38 30 -10 C56 -16 58 20 30 18 C34 40 -2 42 -6 20 C-24 40 -60 30 -46 6 Z" {...st(c, 7)} />
    <path d="M-22 -4 L-6 8 M-6 -4 L-22 8 M8 -4 L24 8 M24 -4 L8 8" {...st(c, 9)} />
  </g>
);
export const Sparkle: React.FC<{x: number; y: number; s?: number; c: string}> = ({x, y, s = 1, c}) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -26 C4 -6 6 -4 26 0 C6 4 4 6 0 26 C-4 6 -6 4 -26 0 C-6 -4 -4 -6 0 -26 Z" fill={c} />
);
export const Drop: React.FC<{x: number; y: number; s?: number; c: string}> = ({x, y, s = 1, c}) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -22 C10 -6 16 2 16 10 C16 20 8 26 0 26 C-8 26 -16 20 -16 10 C-16 2 -10 -6 0 -22 Z" {...st(c, 9)} />
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
        <path d={`M-3 ${y - 5} L3 ${y - 5}`} {...st(c, 8)} />
      </g>
    ) : (
      <g>
        <circle cx={-12} cy={y - 4} r={4} fill={c} />
        <circle cx={12} cy={y - 4} r={4} fill={c} />
      </g>
    )}
    <path d={`M-11 ${y + 12} Q0 ${y + 20} 11 ${y + 12}`} {...st(c, 8)} />
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
          <path key={a} d={`M${-6 + 40 * Math.cos((a * Math.PI) / 180)} ${-46 + 40 * Math.sin((a * Math.PI) / 180)} L${-6 - 40 * Math.cos((a * Math.PI) / 180)} ${-46 - 40 * Math.sin((a * Math.PI) / 180)}`} {...st(c, 9)} />
        ))}
        <circle cx={-6} cy={-46} r={6} fill={c} />
        <circle cx={46} cy={-8} r={8} {...st(c, 6, bg)} />
        <path d="M30 -60 L46 -16" {...st(c, 9)} />
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
        <path d="M42 -92 L92 0" {...st(c, 9)} />
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
        <path d="M78 -96 L96 -58" {...st(c, 9)} />
        <path d="M84 -56 Q120 -64 150 -56 L152 -30 Q120 -24 86 -30 Z" {...st(c, SW, bg)} />
        <path d="M150 -58 Q160 -86 178 -78 Q192 -72 186 -58 Q176 -50 156 -52" {...st(c, SW, bg)} />
        <path d="M170 -80 Q166 -64 160 -66" {...st(c, 8)} />
        <circle cx={180} cy={-70} r={3.5} fill={c} />
        <path d="M94 -30 L92 0 M112 -28 L112 0 M132 -28 L134 0 M148 -30 L150 0 M86 -50 Q72 -60 68 -76" {...st(c, 9)} />
        <path d="M96 -58 L120 -58" {...st(c, 9)} />
      </g>
    );
  return (
    <g>
      {legs}
      <path d="M-44 -100 L-52 0 M44 -100 L52 0 M-44 -100 L-30 -104 M44 -100 L30 -104" {...st(c, 9)} />
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
      <path d={`M${x + 52} ${y + h - 70} L${x + w - 52} ${y + h - 70}`} {...st(c, 8)} />
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
    <path d={`M${PHONE.x + 44} ${PHONE.y + 470} L${PHONE.x + PHONE.w - 120} ${PHONE.y + 470}`} {...st(c, 8)} />
    <path d={`M${PHONE.x + 44} ${PHONE.y + 720} L${PHONE.x + PHONE.w - 44} ${PHONE.y + 720}`} {...st(c, 8)} />
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

// ---------- SETA COM RIG ELÁSTICO ----------
// Continua sempre seta. O corpo pode esticar/amassar (com volume preservado), curvar, inchar e tremer como gelatina.
// Eixo do corpo: da ponta para a cauda. Deformações calculadas sobre o contorno subdividido.
const AX: [number, number] = [0.336, 0.942];
const PX: [number, number] = [-0.942, 0.336];
// proporções mais robustas (haste e cabeça mais largas)
const ARROW_PTS: [number, number][] = [[0, 0], [0, 80], [18, 64], [29, 92], [53, 82], [42, 58], [66, 56]].map(([a, b]) => [a * S, b * S]);
const DENSE: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let i = 0; i < ARROW_PTS.length; i++) {
    const a = ARROW_PTS[i];
    const b = ARROW_PTS[(i + 1) % ARROW_PTS.length];
    const n = Math.max(4, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
})();
const AXLEN = 87 * S;
export type Rig = {stretch?: number; bend?: number; bulge?: number; wobble?: number; phase?: number; lean?: number};
export const rigPoints = ({stretch = 1, bend = 0, bulge = 0, wobble = 0, phase = 0, lean = 0}: Rig) => {
  const vol = 1 / Math.sqrt(Math.min(1.25, Math.max(0.7, stretch)));
  // centro de massa como origem
  const cA = 45 * S * 0.9;
  return DENSE.map(([x, y]) => {
    const t = (x * AX[0] + y * AX[1]) / AXLEN; // 0 ponta, 1 cauda
    let n = x * PX[0] + y * PX[1];
    let ta = (t * AXLEN - cA) * Math.min(1.25, Math.max(0.7, stretch));
    n *= vol * (1 + bulge * Math.sin(Math.PI * Math.min(1, Math.max(0, t))));
    n += wobble * 16 * Math.sin(t * Math.PI * 2.4 - phase) * (0.3 + t);
    n += lean * ta * 0.4;
    // curvatura concentrada na haste; a cabeça (triângulo) só se inclina
    const tc = Math.min(1, Math.max(0, (t - 0.55) / 0.45));
    const ang = bend * (0.18 + 0.82 * Math.pow(tc, 1.4));
    const ux = AX[0] * Math.cos(ang) - AX[1] * Math.sin(ang);
    const uy = AX[0] * Math.sin(ang) + AX[1] * Math.cos(ang);
    const vx = -uy;
    const vy = ux;
    const r = ta;
    return [ux * r + vx * -n * -1, uy * r + vy * -n * -1] as [number, number];
  });
};
export const RubberArrow: React.FC<{x: number; y: number; rot?: number; scale?: number; rig?: Rig; fill?: string; edge?: string}> = ({x, y, rot = 0, scale = 1, rig = {}, fill = ACCENT, edge = BLUE}) => {
  const P = rigPoints(rig);
  const d = P.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('') + 'Z';
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      {/* seta chapada, sem contorno; a cor troca junto com o fundo */}
      <path d={d} fill={fill} stroke={fill} strokeWidth={18} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
};

// ---------- POST DE REDE SOCIAL COM FOTO EM TRAÇO ----------
// Pessoas em proporção natural, numa praça: mulher cadeirante, homem cego com bengala e cão-guia.
const ManCane: React.FC<{c: string; bg: string}> = ({c, bg}) => (
  <g>
    <path d="M92 -146 L150 0" {...st(c, 6)} />
    <path d="M-52 -118 L52 -118 L44 -6 L12 -6 L4 -84 L-4 -84 L-12 -6 L-44 -6 Z" {...st(c, SW, bg)} />
    <path d="M-46 -4 L-8 -4 M10 -4 L50 -4" {...st(c)} />
    <path d="M-48 -230 C-20 -242 20 -242 48 -230 C58 -200 62 -160 56 -116 L-56 -116 C-62 -160 -58 -200 -48 -230 Z" {...st(c, SW, bg)} />
    <path d="M-14 -232 L0 -214 L14 -232" {...st(c, 6)} />
    <path d="M-52 -220 C-68 -190 -70 -150 -64 -112" {...st(c)} />
    <path d="M50 -222 C68 -198 78 -172 92 -146" {...st(c)} />
    <path d="M-9 -252 L-9 -238 M9 -252 L9 -238" {...st(c, 6)} />
    <ellipse cx={0} cy={-286} rx={30} ry={36} {...st(c, SW, bg)} />
    <path d="M-30 -292 C-32 -330 30 -334 30 -292 C18 -306 -8 -312 -30 -292 Z" {...st(c, 6, c)} />
    <rect x={-25} y={-290} width={20} height={14} rx={6} fill={c} />
    <rect x={5} y={-290} width={20} height={14} rx={6} fill={c} />
    <path d="M-10 -262 Q0 -255 10 -262" {...st(c, 5)} />
  </g>
);
const WomanChair: React.FC<{c: string; bg: string}> = ({c, bg}) => (
  <g>
    <path d="M-58 -232 L-62 -146 L-40 -118" {...st(c)} />
    <path d="M-36 -142 L58 -142 L62 -112 L-30 -112 Z" {...st(c, SW, bg)} />
    <path d="M40 -112 L48 -24 L74 -24 M58 -112 L64 -30" {...st(c)} />
    <circle cx={-8} cy={-74} r={74} {...st(c, SW, bg)} />
    <circle cx={-8} cy={-74} r={56} {...st(c, 5)} />
    <circle cx={-8} cy={-74} r={9} fill={c} />
    <path d="M60 -112 L84 -22" {...st(c, 6)} />
    <circle cx={86} cy={-14} r={13} {...st(c, 6, bg)} />
    <path d="M-34 -232 C-10 -240 14 -238 30 -230 C40 -200 40 -170 34 -140 L-38 -140 C-42 -170 -42 -200 -34 -232 Z" {...st(c, SW, bg)} />
    <path d="M26 -222 C44 -196 50 -170 62 -150" {...st(c)} />
    <path d="M-6 -254 L-6 -238 M10 -254 L10 -238" {...st(c, 6)} />
    <ellipse cx={2} cy={-286} rx={29} ry={34} {...st(c, SW, bg)} />
    <path d="M-27 -284 C-34 -326 34 -330 31 -290 C22 -310 -6 -312 -27 -284 Z" {...st(c, 6, c)} />
    <circle cx={-24} cy={-318} r={15} fill={c} />
    <circle cx={-8} cy={-288} r={3.5} fill={c} />
    <circle cx={14} cy={-288} r={3.5} fill={c} />
    <path d="M-6 -268 Q4 -260 14 -268" {...st(c, 5)} />
  </g>
);
const GuideDog: React.FC<{c: string; bg: string}> = ({c, bg}) => (
  <g>
    <path d="M-40 -8 C-50 -50 -40 -86 -6 -96 C26 -104 46 -84 44 -50 L40 -8 Z" {...st(c, SW, bg)} />
    <path d="M-6 -96 C-10 -132 8 -152 30 -150 C54 -148 62 -126 56 -110 C52 -98 34 -96 22 -100" {...st(c, SW, bg)} />
    <path d="M20 -146 C8 -150 0 -128 10 -114" {...st(c, 6)} />
    <circle cx={40} cy={-128} r={4} fill={c} />
    <circle cx={60} cy={-114} r={6} fill={c} />
    <path d="M-30 -60 L36 -70 M-4 -96 L-10 -150 L-40 -156" {...st(c, 6)} />
    <path d="M-40 -8 L-58 -6 M10 -8 L46 -8" {...st(c)} />
  </g>
);
export const PostPhoto: React.FC<{c: string; bg: string; x: number; y: number; s: number}> = ({c, bg, x, y, s}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {/* fundo da praça: sol, árvore, banco e chão */}
    <circle cx={370} cy={80} r={34} fill={c} />
    <path d="M70 330 L70 210" {...st(c)} />
    <path d="M70 214 C20 214 10 160 40 140 C30 96 90 80 110 112 C150 100 170 150 140 176 C160 206 120 222 70 214 Z" {...st(c)} />
    <path d="M300 300 L430 300 M310 300 L306 330 M420 300 L424 330 M300 276 L430 276" {...st(c, 6)} />
    <path d="M0 400 C120 394 300 394 452 400" {...st(c)} />
    <g transform="translate(150 404) scale(0.9)"><WomanChair c={c} bg={bg} /></g>
    <g transform="translate(300 404) scale(0.9)"><ManCane c={c} bg={bg} /></g>
    <g transform="translate(395 404) scale(0.8)"><GuideDog c={c} bg={bg} /></g>
  </g>
);
export const SocialPost: React.FC<{c: string; bg: string; photo?: React.ReactNode}> = ({c, bg, photo}) => {
  const {x, y, w, h, rx} = PHONE;
  const px = x + 44;
  const py = y + 150;
  const ps = w - 88;
  const icon = (d: string, ix: number, iy: number, k: string) => <path key={k} transform={`translate(${ix} ${iy}) scale(0.62)`} d={d} {...st(c)} />;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={rx} {...st(c, SW, bg)} />
      <rect x={x + w / 2 - 50} y={y + 30} width={100} height={20} rx={10} fill={c} />
      {/* cabeçalho do perfil */}
      <circle cx={x + 80} cy={y + 104} r={28} {...st(c, SW, bg)} />
      <circle cx={x + 80} cy={y + 96} r={9} fill={c} />
      <path d={`M${x + 64} ${y + 120} Q${x + 80} ${y + 104} ${x + 96} ${y + 120}`} {...st(c, 6)} />
      <path d={`M${x + 128} ${y + 94} L${x + 300} ${y + 94}`} {...st(c, 14)} />
      <path d={`M${x + 128} ${y + 120} L${x + 230} ${y + 120}`} {...st(c, 8)} />
      <path d={`M${x + w - 92} ${y + 104} L${x + w - 92} ${y + 104} M${x + w - 72} ${y + 104} L${x + w - 72} ${y + 104} M${x + w - 52} ${y + 104} L${x + w - 52} ${y + 104}`} {...st(c, 12)} />
      {/* foto */}
      <defs>
        <clipPath id="photoClip"><rect x={px} y={py} width={ps} height={ps} rx={20} /></clipPath>
      </defs>
      <g clipPath="url(#photoClip)">{photo ?? <PostPhoto c={c} bg={bg} x={px} y={py} s={ps / 452} />}</g>
      <rect x={px} y={py} width={ps} height={ps} rx={20} {...st(c)} />
      {/* ações */}
      {icon('M0 26 C-14 14 -36 0 -36 -14 C-36 -28 -24 -36 -13 -36 C-6 -36 -2 -32 0 -26 C2 -32 6 -36 13 -36 C24 -36 36 -28 36 -14 C36 0 14 14 0 26 Z', px + 26, py + ps + 52, 'h')}
      {icon('M-18 25 C-31 18 -38 9 -38 -3 C-38 -20 -21 -32 0 -32 C21 -32 38 -20 38 -3 C38 15 21 27 0 27 C-5 27 -10 26 -14 25 L-32 36 Z', px + 92, py + ps + 52, 'c')}
      {icon('M-36 -2 L36 -32 L12 34 L1 8 Z M1 8 L36 -32', px + 158, py + ps + 52, 's')}
      {icon('M-22 -34 L22 -34 L22 36 L0 18 L-22 36 Z', px + ps - 20, py + ps + 52, 'b')}
      {/* curtidas e legenda */}
      <path d={`M${px} ${py + ps + 112} L${px + 170} ${py + ps + 112}`} {...st(c, 12)} />
      <path d={`M${px} ${py + ps + 150} L${px + ps - 40} ${py + ps + 150}`} {...st(c, 8)} />
      <path d={`M${px} ${py + ps + 180} L${px + ps - 160} ${py + ps + 180}`} {...st(c, 8)} />
    </g>
  );
};
