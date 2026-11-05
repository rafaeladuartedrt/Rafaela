import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {
  BG, FG, SW, Pt, clamp, lerp, io, outQ, inQ, lin, outBack, prog, sp, hs, breath, track, beatPulse,
  resample, samplePath, lerpPts, toD, followPolyline, Hatch, hatchFill, stroke, drawDash, fragDash, fragWidth, pathLen,
} from './lib';
import {Arrow, Hand} from './characters';
import {Phrase, T, cx, capMid, maskIn, maskOut, Letter} from './text';

// ===================== GEOMETRIA FIXA =====================
const POST = {x: 190, y: 640, w: 580, h: 580, rx: 36};
const POST_D = `M${POST.x + POST.rx} ${POST.y} H${POST.x + POST.w - POST.rx} A${POST.rx} ${POST.rx} 0 0 1 ${POST.x + POST.w} ${POST.y + POST.rx} V${POST.y + POST.h - POST.rx} A${POST.rx} ${POST.rx} 0 0 1 ${POST.x + POST.w - POST.rx} ${POST.y + POST.h} H${POST.x + POST.rx} A${POST.rx} ${POST.rx} 0 0 1 ${POST.x} ${POST.y + POST.h - POST.rx} V${POST.y + POST.rx} A${POST.rx} ${POST.rx} 0 0 1 ${POST.x + POST.rx} ${POST.y} Z`;
const MOUNT_D = 'M232 1172 L384 958 L462 1058 L572 914 L728 1172';
const SUN = {x: 650, y: 790, r: 52};
const SUN_D = `M${SUN.x - SUN.r} ${SUN.y} A${SUN.r} ${SUN.r} 0 1 1 ${SUN.x + SUN.r} ${SUN.y} A${SUN.r} ${SUN.r} 0 1 1 ${SUN.x - SUN.r} ${SUN.y}`;
const BAR_D = 'M190 1272 L890 1272';

const HEART = 'M0 26 C-14 14 -36 0 -36 -14 C-36 -28 -24 -36 -13 -36 C-6 -36 -2 -32 0 -26 C2 -32 6 -36 13 -36 C24 -36 36 -28 36 -14 C36 0 14 14 0 26 Z';
const COMMENT = 'M-18 25 C-31 18 -38 9 -38 -3 C-38 -20 -21 -32 0 -32 C21 -32 38 -20 38 -3 C38 15 21 27 0 27 C-5 27 -10 26 -14 25 L-32 36 Z';
const SHARE = 'M-36 -2 L36 -32 L12 34 L1 8 Z M1 8 L36 -32';
const ICONS = [
  {d: HEART, x: 860, y: 760},
  {d: COMMENT, x: 860, y: 890},
  {d: SHARE, x: 860, y: 1020},
];

const SPEAKER = 'M-58 -20 L-30 -20 L2 -48 L2 48 L-30 20 L-58 20 Z';
const STAIRS: Pt[] = [
  [100, 1240], [210, 1240], [210, 1160], [320, 1160], [320, 1080], [430, 1080], [430, 1000], [540, 1000], [540, 920], [650, 920], [650, 840], [900, 840],
];
const RAMP: Pt[] = [[100, 1240], [650, 840], [650, 1240]];
const BTN = {x: 760, y: 780, h: 96};
const LINE_Y = 1050;
const N = 240;

// ===================== SETA: ROTEIRO DE MOVIMENTO =====================
// [x, y, rotação, escalaX, escalaY] do pivô da seta
const ARROW_KEYS = [
  {f: 0, v: [540, 960, 0, 1, 1]},
  {f: 62, v: [540, 960, 0, 1, 1]},
  {f: 74, v: [554, 950, -10, 1, 1], e: io},
  {f: 92, v: [540, 960, 0, 1, 1], e: outBack},
  {f: 100, v: [540, 960, 0, 1, 1]},
  {f: 124, v: [548, 968, 360, 0.92, 1.06], e: io}, // gira perdida
  {f: 140, v: [390, 1010, 330, 1, 1], e: io},
  {f: 156, v: [650, 985, 388, 1, 1], e: io},
  {f: 170, v: [470, 1065, 342, 1, 1], e: io},
  {f: 186, v: [620, 1092, 360, 1, 1], e: outBack},
  {f: 202, v: [620, 1092, 360, 1, 1]},
  {f: 210, v: [620, 1088, 348, 1, 1], e: io}, // olha para o ícone que acende
  {f: 238, v: [620, 1088, 350, 1, 1]},
  {f: 249, v: [586, 1120, 378, 1.08, 0.9], e: io}, // antecipação
  {f: 261, v: [884, 831, 360, 1, 1], e: outBack}, // vai reta até o curtir
  {f: 263, v: [884, 835, 360, 1.07, 0.86], e: lin}, // clique
  {f: 270, v: [884, 831, 360, 1, 1], e: outBack},
  {f: 296, v: [770, 1140, 360, 1, 1], e: io},
  {f: 345, v: [770, 1140, 360, 1, 1]},
  {f: 352, v: [770, 1150, 342, 1.04, 0.9], e: outQ}, // murcha no silêncio
  {f: 405, v: [770, 1150, 342, 1.04, 0.9]},
  {f: 418, v: [770, 1140, 360, 1, 1], e: io},
  {f: 436, v: [770, 1140, 360, 1, 1]},
  {f: 444, v: [770, 1096, 372, 0.95, 1.08], e: outQ}, // comemora
  {f: 452, v: [770, 1140, 360, 1.07, 0.9], e: inQ},
  {f: 462, v: [770, 1140, 360, 1, 1], e: outBack},
  {f: 506, v: [70, 1183, 360, 1, 1], e: io},
  {f: 520, v: [70, 1183, 360, 1, 1]},
  {f: 528, v: [56, 1186, 346, 1.05, 0.95], e: io}, // antecipação 1
  {f: 540, v: [163, 1183, 370, 1, 1], e: inQ},
  {f: 541, v: [167, 1186, 370, 0.74, 1.12], e: lin}, // impacto 1 (squash)
  {f: 547, v: [160, 1183, 366, 0.9, 1.05], e: outQ},
  {f: 558, v: [92, 1183, 345, 1, 1], e: outQ},
  {f: 566, v: [84, 1183, 360, 1, 1], e: outBack},
  {f: 572, v: [84, 1183, 360, 1, 1]},
  {f: 578, v: [64, 1186, 344, 1.06, 0.94], e: io}, // antecipação 2
  {f: 586, v: [163, 1183, 372, 1, 1], e: inQ},
  {f: 587, v: [167, 1186, 372, 0.72, 1.12], e: lin}, // impacto 2
  {f: 593, v: [160, 1183, 366, 0.9, 1.05], e: outQ},
  {f: 606, v: [78, 1183, 338, 1, 1], e: outQ},
  {f: 616, v: [70, 1183, 352, 1, 1], e: outBack},
  {f: 626, v: [70, 1183, 352, 1, 1]},
  {f: 632, v: [70, 1158, 366, 0.96, 1.05], e: outQ}, // susto com a rampa
  {f: 640, v: [70, 1183, 360, 1, 1], e: inQ},
];
const CLIMB: Pt[] = [[70, 1183], [66, 1193], [616, 793], [674, 831]];
const ARROW_KEYS_B = [
  {f: 680, v: [674, 831, 346, 1, 1]},
  {f: 682, v: [674, 835, 346, 1.07, 0.86], e: lin}, // clique no Seguir
  {f: 690, v: [548, 880, 360, 1, 1], e: outBack}, // sai de cima do botão
  {f: 699, v: [548, 812, 540, 0.95, 1.07], e: outQ}, // comemora girando
  {f: 708, v: [548, 880, 720, 1.06, 0.92], e: inQ},
  {f: 715, v: [548, 880, 720, 1, 1], e: outBack},
  {f: 748, v: [130, 1126, 720, 1, 1], e: io},
  {f: 752, v: [130, 1126, 720, 1, 1]},
  {f: 818, v: [880, 1126, 728, 1, 1], e: io}, // percorre o caminho
  {f: 828, v: [880, 1126, 720, 1, 1], e: outBack},
  {f: 846, v: [880, 1126, 720, 1, 1]},
  {f: 856, v: [868, 1140, 708, 1.05, 0.95], e: io},
  {f: 890, v: [540, 960, 720, 1, 1], e: outBack}, // volta ao centro (loop)
  {f: 900, v: [540, 960, 720, 1, 1]},
];
export const arrowAt = (f: number) => {
  let v: number[];
  if (f < 642) v = track(f, ARROW_KEYS);
  else if (f < 680) {
    const u = io(clamp((f - 642) / 38));
    const p = followPolyline(CLIMB, u);
    v = [p[0], p[1], 360 - 14 * Math.sin(Math.PI * clamp(u * 1.1)), 1, 1];
  } else v = track(f, ARROW_KEYS_B);
  const still = f >= 352 && f < 405; // silêncio: imóvel
  const b = still ? 1 : breath(f);
  return {x: v[0], y: v[1], rot: v[2], sx: v[3] * b, sy: v[4] * b};
};

// ===================== LINHA CONTÍNUA (onda > linha > legenda > degraus) =====================
const wave = (f: number, A: number): Pt[] => {
  const P: Pt[] = [];
  for (let k = 0; k < N; k++) {
    const u = k / (N - 1);
    const env = Math.pow(Math.sin(Math.PI * u), 1.2);
    P.push([140 + 800 * u, 960 + A * env * Math.sin(2 * Math.PI * u * 4 - f * 0.35)]);
  }
  return P;
};
const waveAmp = (f: number) => {
  if (f < 345) return 46 + 44 * beatPulse(f);
  const A0 = 46 + 44 * beatPulse(344.99);
  const t = f - 345;
  return A0 * Math.exp(-t / 2.4) + 7 * Math.exp(-t / 5) * Math.sin(t * 2.4);
};

// ===================== COMPONENTE PRINCIPAL =====================
export const Video: React.FC<{captions?: boolean}> = ({captions = false}) => {
  const f = useCurrentFrame();

  const pre = useMemo(() => {
    const heartPts = samplePath(HEART, N, ICONS[0].x, ICONS[0].y, false);
    const iconPts = ICONS.map((ic) => samplePath(ic.d, 44, ic.x, ic.y));
    const s3b = T.s3b.lines.map((l) => {
      const y = l.y - l.letters[0].size * 0.334;
      return {x1: l.bb[0], x2: l.bb[2], y};
    });
    const stairsR = resample(STAIRS, N);
    const stairParts = [stairsR.slice(0, 80), stairsR.slice(80, 160), stairsR.slice(160, 240)];
    const linePts = resample([[-40, LINE_Y], [1120, LINE_Y]], N);
    const spiral: Pt[] = [];
    for (let k = 0; k < N; k++) {
      const u = k / (N - 1);
      const th = Math.PI + u * 3 * 2 * Math.PI;
      const r = 140 * Math.pow(1 - u, 0.85);
      spiral.push([540 + r * Math.cos(th), 960 + r * Math.sin(th)]);
    }
    const lens = {post: pathLen(POST_D), mount: pathLen(MOUNT_D), sun: pathLen(SUN_D), bar: 700, icons: ICONS.map((i) => pathLen(i.d))};
    return {heartPts, iconPts, s3b, stairParts, linePts, spiral, lens};
  }, []);

  const defs: React.ReactNode[] = [];
  const illus: React.ReactNode[] = [];
  const over: React.ReactNode[] = [];

  // ---------------- CENA 1 e 2: INTERFACE DO REELS ----------------
  if (f < 292) {
    const L = pre.lens;
    const draw = (a: number, b: number) => prog(f, a, b, outQ);
    // fragmentação (apagar) e remontagem
    const q = (k: number) => (f < 200 ? prog(f, 106 + k * 4, 160 + k * 4, io) : 1 - prog(f, 214 + k * 3, 240 + k * 3, io));
    const crawl = f * 0.8;
    // vibração antes da mudança
    const vib = prog(f, 66, 96, lin) * (f < 104 ? 1 : 0);
    // recolhimento para o coração
    const col = prog(f, 272, 290, inQ);
    const ant = 1 + 0.05 * Math.sin(Math.PI * prog(f, 264, 274, io));
    const cs = (1 - col) * (f > 264 ? ant : 1);
    const colT = `translate(${ICONS[0].x} ${ICONS[0].y}) scale(${cs}) translate(${-ICONS[0].x} ${-ICONS[0].y})`;

    // sol: preenchimento por hachura
    let sunW: number;
    let sunS = 14;
    if (f < 100) sunW = 14 * prog(f, 13, 24, outQ);
    else if (f < 200) {
      sunW = lerp(14, 3, prog(f, 100, 124)) * (1 - prog(f, 140, 152, lin));
      sunS = lerp(14, 36, prog(f, 112, 140));
    } else {
      sunW = 14 * prog(f, 224, 248, outQ);
      sunS = lerp(36, 14, prog(f, 224, 248));
    }
    defs.push(<Hatch key="sunh" id="sunh" weight={sunW} spacing={sunS} angle={45} />);

    const outline = (d: string, len: number, a: number, b: number, k: number, key: string) => {
      const qq = q(k);
      if (f > 160 + k * 4 && f < 214 && qq >= 1) return null;
      const dashed = f < 30 ? drawDash(len, draw(a, b)) : fragDash(qq, 46, crawl);
      return <path key={key} d={d} fill="none" {...stroke(fragWidth(qq))} {...dashed} />;
    };

    illus.push(
      <g key="ui" transform={col > 0 ? colT : undefined}>
        {outline(POST_D, L.post, 0, 16, 0, 'frame')}
        {outline(MOUNT_D, L.mount, 5, 20, 1, 'mount')}
        <path d={SUN_D} fill={hatchFill('sunh', sunW, sunS)} stroke="none" />
        {outline(SUN_D, L.sun, 7, 19, 2, 'sun')}
        {outline(BAR_D, L.bar, 9, 21, 3, 'bar')}
        {/* progresso */}
        {(() => {
          const qq = q(3);
          const px = 190 + 160 * prog(f, 18, 100, lin) + (f > 200 ? 300 * prog(f, 214, 250) : 0);
          const r = 12 * (1 - clamp((qq - 0.4) / 0.6)) * prog(f, 16, 24, outBack);
          return r > 0.3 ? <circle cx={px} cy={1272} r={r} fill={FG} /> : null;
        })()}
      </g>,
    );

    // ícones: curtir, comentar, compartilhar
    ICONS.forEach((ic, k) => {
      const outA = 100 + k * 4;
      const inA = 212 + k * 3;
      const isHeart = k === 0;
      const solid = f < outA || f >= inA + 26;
      const jit = vib * 7;
      const rot = hs(Math.floor(f) * 1.7 + k) * jit;
      const dx = hs(Math.floor(f) * 2.3 + k * 9) * jit * 0.5;
      if (isHeart && f >= 278) return; // o coração vira a onda (ver abaixo)
      if (solid) {
        const len = pre.lens.icons[k];
        const pop = isHeart && f >= 262 ? 1 + 0.25 * Math.sin(Math.PI * prog(f, 262, 274, outQ)) : 1;
        const hw = isHeart ? (f >= 262 ? 14 * prog(f, 262, 268, outQ) * (1 - prog(f, 270, 278, io)) : 0) : 0;
        if (isHeart) defs.push(<Hatch key="hh" id="hh" weight={hw} spacing={14} />);
        const g = (
          <g key={`ic${k}`} transform={`translate(${ic.x + dx} ${ic.y}) rotate(${rot}) scale(${pop})`}>
            <path d={ic.d} fill={isHeart ? hatchFill('hh', hw, 14) : BG} {...stroke()} {...(f < 30 ? drawDash(len, draw(4 + k * 2, 18 + k * 2)) : {})} />
          </g>
        );
        if (isHeart) illus.push(g);
        else illus.push(<g key={`icw${k}`} transform={col > 0 ? colT : undefined}>{g}</g>);
      } else {
        // partículas
        const pts = pre.iconPts[k];
        const t = f < 200 ? prog(f, outA, outA + 46, outQ) : 1 - prog(f, inA, inA + 26, io);
        const parts = pts.map((p, i) => {
          const a = hash2(i, k) * Math.PI * 2;
          const dist = 40 + hash2(i + 50, k) * 150;
          const x = p[0] + Math.cos(a) * dist * t - 60 * t * t;
          const y = p[1] + Math.sin(a) * dist * t + 40 * t * t;
          const r = 3.6 * (1 - t);
          return r > 0.2 ? <circle key={i} cx={x} cy={y} r={r} fill={FG} /> : null;
        });
        illus.push(<g key={`pc${k}`} transform={col > 0 ? colT : undefined}>{parts}</g>);
      }
    });
  }

  // ---------------- CENA 2: ÍCONE DE AUDIODESCRIÇÃO ----------------
  if (f >= 178 && f < 292) {
    const ad = T.ad.lines[0];
    const w = ad.bb[2] - ad.bb[0];
    const xe = ad.bb[2] + 22;
    const midX = (ad.bb[0] + xe + 60) / 2;
    const cy = -43;
    const m = prog(f, 214, 240, io);
    const px = lerp(480, 286, m);
    const py = lerp(930, 728, m);
    const sc0 = lerp(1, 0.42, m);
    const pulse = 1 + 0.14 * Math.sin(Math.PI * prog(f, 204, 218, outQ));
    const col = prog(f, 272, 290, inQ);
    const ant = 1 + 0.05 * Math.sin(Math.PI * prog(f, 264, 274, io));
    const cs = (1 - col) * (f > 264 ? ant : 1);
    const fw = 10 * prog(f, 196, 205, outQ);
    defs.push(<Hatch key="adh" id="adh" weight={fw} spacing={10} />);
    const arcs = [24, 44, 64].map((r, i) => {
      const a0 = (-50 * Math.PI) / 180;
      const a1 = (50 * Math.PI) / 180;
      const d = `M${xe + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${xe + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`;
      const len = r * (100 * Math.PI) / 180;
      return <path key={i} d={d} fill="none" {...stroke()} {...drawDash(len, prog(f, 186 + i * 3, 198 + i * 3, outQ))} />;
    });
    const g = (
      <g key="ad" transform={`translate(${ICONS[0].x} ${ICONS[0].y}) scale(${cs}) translate(${-ICONS[0].x} ${-ICONS[0].y}) translate(${px} ${py}) scale(${sc0 * pulse}) translate(${-midX} ${-cy})`}>
        {ad.letters.map((l, i) => (
          <path key={i} d={l.d} fill={hatchFill('adh', fw, 10)} {...stroke(6)} {...drawDash(l.len, prog(f, 180 + i * 3, 196 + i * 3, outQ))} />
        ))}
        {arcs}
      </g>
    );
    illus.push(g);
    // anel de "acender": pulso único e suave (sem flash)
    if (f >= 205 && f < 234) {
      const t = prog(f, 205, 234, outQ);
      illus.push(<circle key="ring" cx={480} cy={930} r={40 + 260 * t} fill="none" {...stroke(SW * (1 - t))} />);
    }
    void w;
  }
  // mão que aponta para o ícone
  if (f >= 174 && f < 230) {
    const a = sp(f, 174, 12, 120);
    const r = prog(f, 210, 230, inQ);
    const tap = 14 * Math.sin(Math.PI * prog(f, 196, 204, io));
    const x = lerp(-180, 240, a) - 420 * r + tap * 0.79;
    const y = lerp(1440, 1160, a) + 280 * r - tap * 0.62;
    over.push(<Hand key="hp" pose="point" transform={`translate(${x} ${y}) rotate(52) scale(0.7)`} />);
  }

  // ---------------- CENA 3: ONDA SONORA E LINHA ----------------
  if (f >= 278 && f < 405) {
    let P: Pt[];
    if (f < 300) {
      const t = prog(f, 278, 300, io);
      P = lerpPts(pre.heartPts, wave(300, waveAmp(300)), t);
    } else P = wave(f, waveAmp(f));
    illus.push(<path key="wave" d={toD(P)} fill="none" {...stroke()} />);
  }
  // ícone de som cortado
  if (f >= 326 && f < 360) {
    const ret = f < 348 ? 1 : (1 + 0.1 * Math.sin(Math.PI * prog(f, 348, 352, io))) * (1 - prog(f, 351, 359, inQ));
    const len = pathLen(SPEAKER);
    illus.push(
      <g key="spk" transform={`translate(530 700) scale(${ret})`}>
        <path d={SPEAKER} fill={BG} {...stroke()} {...drawDash(len, prog(f, 326, 338, outQ))} />
        <path d="M26 -24 L72 24" fill="none" {...stroke()} {...drawDash(66, prog(f, 336, 341, outQ))} />
        <path d="M72 -24 L26 24" fill="none" {...stroke()} {...drawDash(66, prog(f, 340, 345, outQ))} />
      </g>,
    );
  }
  // linha > barras de legenda > (letras) > barras > degraus
  if (f >= 405 && f < 516) {
    const flat = wave(405, 0);
    if (f < 420) {
      const t = prog(f, 405, 420, io);
      pre.s3b.forEach((b, i) => {
        const seg = flat.slice(i * 80, i * 80 + 80);
        const tgt = resample([[b.x1, b.y], [b.x2, b.y]], 80);
        illus.push(<path key={`sb${i}`} d={toD(lerpPts(seg, tgt, t))} fill="none" {...stroke(lerp(SW, 30, t))} />);
      });
    } else if (f < 442) {
      pre.s3b.forEach((b, i) => {
        const wx = lerp(b.x1 - 20, b.x2 + 20, prog(f, 420 + i * 3, 436 + i * 3, io));
        if (wx < b.x2) illus.push(<path key={`sb${i}`} d={`M${Math.max(wx, b.x1)} ${b.y} L${b.x2} ${b.y}`} fill="none" {...stroke(30)} />);
      });
    } else if (f >= 484 && f < 496) {
      pre.s3b.forEach((b, i) => {
        const wx = lerp(b.x1 - 20, b.x2 + 20, prog(f, 484 + i * 2, 494 + i * 2, io));
        if (wx > b.x1) illus.push(<path key={`sb${i}`} d={`M${b.x1} ${b.y} L${Math.min(wx, b.x2)} ${b.y}`} fill="none" {...stroke(30)} />);
      });
    } else if (f >= 496) {
      const t = prog(f, 496, 515, io);
      pre.s3b.forEach((b, i) => {
        const src = resample([[b.x1, b.y], [b.x2, b.y]], 80);
        illus.push(<path key={`st${i}`} d={toD(lerpPts(src, pre.stairParts[i], t))} fill="none" {...stroke(lerp(30, SW, t))} />);
      });
    }
  }
  // Libras: círculo + mão no sinal da letra L do alfabeto manual
  if (f >= 424 && f < 502) {
    const c = {x: 250, y: 1150, r: 112};
    const circLen = 2 * Math.PI * c.r;
    const dc = f < 488 ? prog(f, 424, 440, outQ) : 1 - prog(f, 488, 501, inQ);
    const rise = (1 - sp(f, 432, 13, 120)) * 230 + 240 * prog(f, 480, 494, inQ);
    const sig = f > 448 && f < 482 ? 4 * Math.sin(((f - 448) / 34) * Math.PI * 2) : 0;
    defs.push(
      <clipPath key="libc" id="libc">
        <circle cx={c.x} cy={c.y} r={c.r - 4} />
      </clipPath>,
    );
    illus.push(
      <g key="lib">
        <path d={`M${c.x} ${c.y + c.r} A${c.r} ${c.r} 0 1 1 ${c.x} ${c.y - c.r} A${c.r} ${c.r} 0 1 1 ${c.x} ${c.y + c.r}`} fill="none" {...stroke()} {...drawDash(circLen, dc)} />
        <g clipPath="url(#libc)">
          <Hand pose="L" transform={`translate(${c.x - 14} ${c.y + 92 + rise}) rotate(${sig}) scale(0.6)`} sleeve={400} />
        </g>
      </g>,
    );
  }

  // ---------------- CENA 4: ESCADA, BOTÃO E RAMPA ----------------
  if (f >= 515 && f < 628) illus.push(<path key="stairs" d={toD(resample(STAIRS, N))} fill="none" {...stroke()} />);
  // rampa
  if (f >= 598 && f < 727) {
    const s = sp(f, 600, 11, 80, 1);
    const tx = 1000 * (1 - s);
    const land = 1 - 0.05 * Math.sin(Math.PI * prog(f, 618, 630, io));
    const fl = prog(f, 706, 726, io);
    const V: Pt[] = RAMP.map((p) => [p[0] + tx, 1240 - (1240 - p[1]) * land]);
    const tgt: Pt[] = [[-40, LINE_Y], [1120, LINE_Y], [1120, LINE_Y]];
    const W = lerpPts(V, tgt, fl);
    const plat: Pt[] = lerpPts([[650 + tx, 840], [900 + tx, 840]], [[800, LINE_Y], [1120, LINE_Y]], fl);
    defs.push(<Hatch key="rh" id="rh" weight={5} spacing={30} angle={54} />);
    defs.push(
      <clipPath key="rc" id="rc">
        <path d={toD(W, true)} />
      </clipPath>,
    );
    if (f >= 628) illus.push(<path key="plat" d={toD(plat)} fill="none" {...stroke()} />);
    illus.push(
      <g key="ramp">
        <path d={toD(W, true)} fill={BG} />
        <rect x={-100} y={700} width={1300} height={600} fill="url(#rh)" clipPath="url(#rc)" />
        <path d={toD(W, true)} fill="none" {...stroke()} />
      </g>,
    );
    // mão que empurra a rampa
    if (f < 650) {
      const r = prog(f, 626, 650, inQ);
      const hx = 650 + tx + 46 + 640 * r;
      over.push(<Hand key="ho" pose="open" transform={`translate(${hx} ${1196 + 40 * r}) rotate(-6) scale(0.7)`} />);
    }
  }
  // botão Seguir / Seguindo
  if (f >= 512 && f < 725) {
    const wB = 280 + 60 * sp(f, 680, 12, 160);
    const ex = f < 714 ? 1 : (1 + 0.08 * Math.sin(Math.PI * prog(f, 714, 718, io))) * (1 - prog(f, 717, 724, inQ));
    const h = BTN.h;
    const per = 2 * (wB - h) + Math.PI * h;
    const fw = 12 * prog(f, 680, 687, outQ);
    defs.push(<Hatch key="bh" id="bh" weight={fw} spacing={12} />);
    const pill = `M${BTN.x - wB / 2 + h / 2} ${BTN.y - h / 2} H${BTN.x + wB / 2 - h / 2} A${h / 2} ${h / 2} 0 0 1 ${BTN.x + wB / 2 - h / 2} ${BTN.y + h / 2} H${BTN.x - wB / 2 + h / 2} A${h / 2} ${h / 2} 0 0 1 ${BTN.x - wB / 2 + h / 2} ${BTN.y - h / 2} Z`;
    const filled = f >= 687;
    const sw = prog(f, 687, 700, io);
    const A = T.btnA.lines[0].letters;
    const B = T.btnB.lines[0].letters;
    const textY = BTN.y + 22;
    const letters: React.ReactNode[] = [];
    B.forEach((lb, i) => {
      const la: Letter | undefined = i < 5 ? A[i] : undefined;
      let s = 1;
      let dx = 0;
      if (la) {
        s = sp(f, 518 + i * 1.5, 10, 170);
        dx = lerp(la.x, lb.x, sw) - lb.x;
      } else s = sp(f, 689 + (i - 5) * 2, 10, 170);
      if (s <= 0.001) return;
      letters.push(
        <path key={`b${i}`} d={lb.d} fill={filled ? BG : FG} transform={`translate(${BTN.x + dx} ${textY}) translate(${cx(lb)} -22) scale(${s}) translate(${-cx(lb)} 22)`} />,
      );
    });
    if (!filled || sw < 1) {
      const r = A[5];
      const s = f < 687 ? sp(f, 518 + 5 * 1.5, 10, 170) : 1 - prog(f, 687, 693, inQ);
      if (s > 0.001)
        letters.push(
          <path key="ar" d={r.d} fill={filled ? BG : FG} transform={`translate(${BTN.x + lerp(0, 60, sw)} ${textY}) translate(${cx(r)} -22) scale(${s}) translate(${-cx(r)} 22)`} />,
        );
    }
    illus.push(
      <g key="btn" transform={`translate(${BTN.x} ${BTN.y}) scale(${ex}) translate(${-BTN.x} ${-BTN.y})`}>
        <path d={pill} fill={hatchFill('bh', fw, 12)} {...stroke()} {...(f < 530 ? drawDash(per, prog(f, 512, 528, outQ)) : {})} />
        {letters}
      </g>,
    );
  }

  // ---------------- CENA 5: CAMINHO, ÍCONES E ESPIRAL ----------------
  if (f >= 726 && f < 899) {
    let P: Pt[];
    let w = SW;
    if (f < 842) P = pre.linePts;
    else if (f < 872) P = lerpPts(pre.linePts, pre.spiral, prog(f, 842, 872, io));
    else {
      const k = 1 - prog(f, 872, 897, inQ);
      P = pre.spiral.map((p) => [540 + (p[0] - 540) * k, 960 + (p[1] - 960) * k]);
      w = SW * (1 + 0.4 * prog(f, 872, 880)) * (1 - prog(f, 889, 898, lin));
    }
    const rot = f >= 860 ? (f - 860) * 7 : 0;
    if (w > 0.2) illus.push(<path key="line5" d={toD(P)} fill="none" transform={`rotate(${rot} 540 960)`} {...stroke(w)} />);
  }
  if (f >= 728 && f < 872) {
    const xs = [255, 445, 635, 825];
    const ar = arrowAt(f);
    xs.forEach((x, k) => {
      const st = 730 + k * 4.5;
      const s = sp(f, st, 9, 170);
      if (s <= 0.001) return;
      const pass = f > 752 && f < 830 ? Math.exp(-Math.pow((ar.x - x) / 45, 2)) : 0;
      const g = prog(f, 842 + k * 2, 868, inQ);
      const ang = Math.atan2(LINE_Y - 960, x - 540);
      const rr = Math.hypot(x - 540, LINE_Y - 960) * (1 - g);
      const gx = 540 + rr * Math.cos(ang + g * 2.2);
      const gy = 960 + rr * Math.sin(ang + g * 2.2);
      const sc = s * (1 + 0.14 * pass) * (1 - g);
      illus.push(
        <g key={`i5${k}`} transform={`translate(${gx} ${gy - 4}) rotate(${g * 200}) scale(${sc})`}>
          {icon5(k)}
        </g>,
      );
    });
  }

  // ---------------- TEXTOS ----------------
  const texts: React.ReactNode[] = [];
  // CENA 1
  if (f >= 6 && f < 92)
    texts.push(
      <Phrase key="s1a" id="s1a" uid="s1a" fn={(l, i, li, line, gi) => {
        const st = 6 + l.word * 5;
        if (f < st) return {hide: true};
        const p = sp(f, st, 11, 170);
        const e = prog(f, 80 + gi * 0.4, 88 + gi * 0.4, inQ);
        return {dy: maskIn(p, l) + maskOut(e, l)};
      }} />,
    );
  if (f >= 24 && f < 94)
    texts.push(
      <Phrase key="s1b" id="s1b" uid="s1b" fn={(l, i, li, line, gi) => {
        const st = 24 + gi * 0.9;
        if (f < st) return {hide: true};
        const p = sp(f, st, 16, 70, 1);
        const e = prog(f, 83 + gi * 0.3, 91 + gi * 0.3, inQ);
        return {dx: (cx(l) - 540) * 0.45 * (1 - prog(f, 24, 66, outQ)), dy: maskIn(p, l) + maskOut(e, l)};
      }} />,
    );
  // CENA 2
  if (f >= 100 && f < 192)
    texts.push(
      <Phrase key="s2a" id="s2a" uid="s2a" clip={false} fn={(l, i, li, line, gi) => {
        const st = 100 + l.word * 4;
        if (f < st) return {hide: true};
        const p = sp(f, st, 11, 170);
        const dp = prog(f, 124, 134, outQ) - prog(f, 144, 154, io); // desconforto: no máximo 1s
        const a = prog(f, 170, 182);
        const sw = 4 * prog(f, 124, 134) * (1 - prog(f, 180, 190, lin));
        const dash = `${lerp(8, 0.01, a)} ${lerp(7, 14, a)}`;
        const fillW = f < 124 ? 9 : lerp(9, 3.2, prog(f, 124, 138)) * (1 - prog(f, 170, 182));
        return {
          dx: hs(gi * 3.1) * 14 * dp,
          dy: hs(gi * 7.7) * 40 * dp + (1 - Math.min(p, 1.2)) * 60 + 20 * prog(f, 170, 190),
          rot: hs(gi * 1.3) * 24 * dp,
          sx: clamp(p * 1.4, 0, 1.2), sy: clamp(p * 1.4, 0, 1.2),
          fillW, spacing: 9, sw, dash: sw > 0 ? dash : undefined, dashOffset: f * 0.6,
        };
      }} />,
    );
  if (f >= 207 && f < 302) {
    const pulse = 1 + 0.06 * Math.sin(Math.PI * prog(f, 229, 241, io));
    texts.push(
      <Phrase key="s2b" id="s2b" uid="s2b" clip={false} transform={`translate(540 410) scale(${pulse}) translate(-540 -410)`} fn={(l, i, li, line, gi) => {
        const st = 207 + gi * 0.45;
        if (f < st) return {hide: true};
        const p = sp(f, st, 18, 120, 1);
        const q = 1 - p;
        const e = 1 - prog(f, 292 + gi * 0.25, 300 + gi * 0.25, inQ);
        return {dx: hs(gi * 2.3) * 140 * q, dy: hs(gi * 5.1) * 90 * q, rot: hs(gi * 0.7) * 50 * q, sx: 0.15 + 0.85 * p, sy: (0.15 + 0.85 * p) * e, oy: l.y};
      }} />,
    );
  }
  // CENA 3
  if (f >= 303 && f < 415)
    texts.push(
      <Phrase key="s3a" id="s3a" uid="s3a" clip={false} fn={(l, i, li, line, gi) => {
        const st = 303 + gi;
        if (f < st) return {hide: true};
        const p = sp(f, st, 9, 160);
        const beat = f < 345 ? 1 + 0.08 * beatPulse(f) : 1;
        const flat = lerp(1, 0.42, prog(f, 345, 351, outQ));
        const e = 1 - prog(f, 405 + gi * 0.4, 412 + gi * 0.4, inQ);
        return {sx: p * beat, sy: p * beat * flat * e, oy: l.y};
      }} />,
    );
  if (f >= 420 && f < 496)
    texts.push(
      <Phrase key="s3b" id="s3b" uid="s3b" clip={false} fn={(l, i, li) => {
        const b = pre.s3b[li];
        const y = b.y;
        let s: number;
        if (f < 470) {
          const wx = lerp(b.x1 - 20, b.x2 + 20, prog(f, 420 + li * 3, 436 + li * 3, io));
          if (wx < l.bb[0]) return {hide: true};
          s = 0.3 + 0.7 * outBack(clamp((wx - l.bb[0]) / 80));
        } else {
          const wx = lerp(b.x1 - 20, b.x2 + 20, prog(f, 484 + li * 2, 494 + li * 2, io));
          if (wx > l.bb[2]) return {hide: true};
          s = 0.3 + 0.7 * clamp((l.bb[2] - wx) / (l.bb[2] - l.bb[0] + 40));
        }
        return {sy: s, oy: y};
      }} />,
    );
  // CENA 4
  if (f >= 516 && f < 612) {
    const impacts = [541, 587];
    texts.push(
      <Phrase key="s4a" id="s4a" uid="s4a" clip={false} fn={(l, i, li, line, gi) => {
        const st = 516 + li * 6;
        if (f < st) return {hide: true};
        const p = sp(f, st, 10, 150);
        let tr = 0;
        impacts.forEach((I) => {
          if (f >= I && f < I + 12) tr += Math.exp(-(f - I) / 3);
        });
        const fi = Math.floor(f);
        const e = 1 - prog(f, 598 + li * 2, 606 + li * 2, inQ);
        const s = clamp(p, 0, 1.15) * e;
        return {
          dx: -46 * (1 - p) + hs(gi * 3 + fi) * 6 * tr,
          dy: -34 * (1 - p) - 22 * Math.sin(Math.PI * clamp(p)) + hs(gi * 5 + fi * 1.7) * 5 * tr,
          rot: hs(gi * 7 + fi) * 3 * tr,
          sx: s, sy: s * (1 - 0.1 * Math.sin(Math.PI * prog(f, st + 7, st + 13))),
          ox: line.bb[0], oy: line.y,
        };
      }} />,
    );
  }
  if (f >= 612 && f < 716) {
    const a = prog(f, 612, 636, outQ);
    const r = -18 * (1 - prog(f, 630, 652, io));
    texts.push(
      <Phrase key="s4b" id="s4b" uid="s4b" transform={`translate(${520 * (1 - a)} ${330 * (1 - a)}) rotate(${r} 540 420)`} fn={(l, i, li, line, gi) => {
        const e = prog(f, 704 + gi * 0.3, 712 + gi * 0.3, inQ);
        return {dy: maskOut(e, l)};
      }} />,
    );
  }
  // CENA 5
  if (f >= 716 && f < 797)
    texts.push(
      <Phrase key="s5a" id="s5a" uid="s5a" fn={(l, i, li, line, gi) => {
        const e = prog(f, 784 + gi * 0.25, 792 + gi * 0.25, inQ);
        const fi = Math.floor(f / 2);
        if (li === 0) {
          const st = 716 + gi * 0.7;
          if (f < st) return {hide: true};
          const p = sp(f, st, 12, 150);
          const amp = 3.5 * (1 - prog(f, 716, 746, lin)); // instabilidade < 1s
          return {sx: p, sy: p, dx: hs(gi * 13 + fi) * amp, dy: hs(gi * 7 + fi * 3) * amp + maskOut(e, l), rot: hs(gi + fi * 5) * amp};
        }
        if (li === 1) {
          const st = 728 + l.word * 3;
          if (f < st) return {hide: true};
          return {dy: maskIn(sp(f, st, 13, 150), l) + maskOut(e, l)};
        }
        const isB = l.weight === 'B';
        const st = isB ? 741 : 736;
        if (f < st) return {hide: true};
        const p = sp(f, st, 13, 150);
        if (!isB) return {dy: maskIn(p, l) + maskOut(e, l)};
        const bl = line.letters.filter((x) => x.weight === 'B');
        const mid = (bl[3].bb[2] + bl[4].bb[0]) / 2;
        const side = cx(l) < mid ? -1 : 1;
        const d = sp(f, 762, 9, 170);
        const big = lerp(1.32, 1, prog(f, 741, 758, outQ));
        const wordC = (bl[0].bb[0] + bl[bl.length - 1].bb[2]) / 2;
        return {
          dx: (side < 0 ? -12 : 34) * d + (cx(l) - wordC) * (big - 1),
          dy: maskIn(p, l) + maskOut(e, l),
          rot: side * 4 * d,
          sx: big, sy: big,
          ox: cx(l), oy: l.y,
        };
      }} />,
    );
  if (f >= 796 && f < 892) {
    const pulse = 1 + 0.045 * Math.sin(Math.PI * prog(f, 838, 850, io));
    texts.push(
      <Phrase key="s5b" id="s5b" uid="s5b" transform={`translate(540 520) scale(${pulse}) translate(-540 -520)`} fn={(l, i, li, line, gi) => {
        const st = 796 + gi * 1.5;
        if (f < st) return {hide: true};
        const dr = drawDash(l.len, prog(f, st, st + 10, io));
        const e = prog(f, 880 + gi * 0.25, 888 + gi * 0.25, inQ);
        return {fillW: 9 * prog(f, st + 7, st + 14, outQ), spacing: 9, sw: 5, dash: dr.strokeDasharray, dashOffset: dr.strokeDashoffset, dy: maskOut(e, l)};
      }} />,
    );
  }

  // ---------------- LEGENDA QUEIMADA DA NARRAÇÃO ----------------
  if (captions) {
    const caps: [string, number, number][] = [['n1', 15, 69], ['n2', 105, 174], ['n3', 796, 889]];
    caps.forEach(([id, a, b]) => {
      if (f < a || f >= b) return;
      texts.push(
        <Phrase key={id} id={id} uid={id} fn={(l) => ({dy: maskIn(prog(f, a, a + 7, outQ), l) + maskOut(prog(f, b - 7, b, inQ), l)})} />,
      );
    });
  }

  const ar = arrowAt(f);
  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
        <defs>
          <filter id="boil" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves={1} seed={Math.floor(f / 4) % 97} />
            <feDisplacementMap in="SourceGraphic" scale={3.2} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {defs}
        </defs>
        <rect x={0} y={0} width={1080} height={1920} fill={BG} />
        <g filter="url(#boil)">{illus}</g>
        {texts}
        {over}
        <Arrow {...ar} />
      </svg>
    </AbsoluteFill>
  );
};

const hash2 = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// Ícones da cena final (base do ícone em y=0, centrado em x=0)
const icon5 = (k: number) => {
  if (k === 0) {
    const ad = T.ad.lines[0];
    const xe = ad.bb[2] + 22;
    const midX = (ad.bb[0] + xe + 60) / 2;
    return (
      <g transform={`scale(0.4) translate(${-midX} -20)`}>
        {ad.letters.map((l, i) => (
          <path key={i} d={l.d} fill={FG} {...stroke(5)} />
        ))}
        {[24, 44, 64].map((r, i) => {
          const a0 = (-50 * Math.PI) / 180;
          const a1 = (50 * Math.PI) / 180;
          return <path key={`a${i}`} d={`M${xe + r * Math.cos(a0)} ${-43 + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${xe + r * Math.cos(a1)} ${-43 + r * Math.sin(a1)}`} fill="none" {...stroke()} />;
        })}
      </g>
    );
  }
  if (k === 1)
    return (
      <g>
        <rect x={-58} y={-92} width={116} height={86} rx={16} fill={BG} {...stroke()} />
        <path d="M-34 -42 L34 -42 M-34 -22 L12 -22" fill="none" {...stroke(10)} />
      </g>
    );
  if (k === 2)
    return (
      <g>
        <clipPath id="lib5">
          <circle cx={0} cy={-50} r={44} />
        </clipPath>
        <circle cx={0} cy={-50} r={47} fill={BG} {...stroke()} />
        <g clipPath="url(#lib5)">
          <Hand pose="L" transform="translate(-6 -8) scale(0.26)" sleeve={300} />
        </g>
      </g>
    );
  // Símbolo internacional de acesso (cadeira de rodas), em traço
  return (
    <g transform="translate(-4 0)">
      <circle cx={-6} cy={-86} r={10} fill={FG} />
      <path d="M-10 -66 L-12 -36 L20 -36 L32 -4" fill="none" {...stroke()} />
      <path d="M-11 -54 L16 -54" fill="none" {...stroke()} />
      <path d="M4 -48 A30 30 0 1 0 22 -16" fill="none" {...stroke()} transform="translate(-14 4)" />
    </g>
  );
};
