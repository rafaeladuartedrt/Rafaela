import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { C, FONT } from '../theme';
import { E, lerp, seg, useT } from './time';
import { asset, useU } from './units';
import { Photo, Word } from './ui';

/**
 * Mosaico em blocos (ref. A). Cada bloco entra por máscara retangular (varredura)
 * e sai deslizando em bloco. Grid base 4x3 = 875x667 px (master).
 */
type Dir = 'top' | 'bottom' | 'left' | 'right';
export type TileSpec = {
  x: number; y: number; w: number; h: number;
  kind: 'photo' | 'cut' | 'color';
  /** 'cut': peça recortada (manchete sem fundo ou foto da matéria) centrada sobre o bloco */
  maxScale?: number;
  src?: string; iw?: number; ih?: number; fx?: number; fy?: number; scale?: number; drift?: [number, number];
  color?: string; label?: string; support?: string[];
  /** padrão de texto repetido pequeno sobre a foto (ref. A: "WORLD NEWS") */
  pattern?: string;
  /** janela [entra, sai] da palavra/padrão dentro do bloco (palavras nunca juntas na tela) */
  labelIn?: number; labelOut?: number;
  inAt: number; inDur?: number; inFrom?: Dir;
  outAt?: number; outDur?: number; outTo?: Dir;
};

const insetFor = (dir: Dir, r: number) =>
  ({ top: `0 0 ${r}% 0`, bottom: `${r}% 0 0 0`, right: `0 0 0 ${r}%`, left: `0 ${r}% 0 0` })[dir];

export const Tile: React.FC<{ s: TileSpec; t0: number; t1: number }> = ({ s, t0, t1 }) => {
  const t = useT();
  const u = useU();
  const pin = seg(t, s.inAt, s.inAt + (s.inDur ?? 0.55), E.main);
  if (pin <= 0) return null;
  const pout = s.outAt !== undefined ? seg(t, s.outAt, s.outAt + (s.outDur ?? 0.5), E.main) : 0;
  if (pout >= 1) return null;
  const to = s.outTo ?? 'left';
  const ox = to === 'left' ? -1 : to === 'right' ? 1 : 0;
  const oy = to === 'top' ? -1 : to === 'bottom' ? 1 : 0;
  const tx = ox * pout * (to === 'left' ? s.x + s.w : 3500 - s.x) ;
  const ty = oy * pout * (to === 'top' ? s.y + s.h : 2000 - s.y);
  const dp = seg(t, t0, t1, E.soft);
  const labelP = Math.min(
    s.labelIn !== undefined ? seg(t, s.labelIn, s.labelIn + 0.45, E.out) : 1,
    s.labelOut !== undefined ? 1 - seg(t, s.labelOut, s.labelOut + 0.35, E.soft) : 1);
  const [dx, dy] = s.drift ?? [0, 0];
  let body: React.ReactNode = null;
  if (s.kind === 'photo') {
    body = <Photo src={asset(s.src!)} iw={s.iw!} ih={s.ih!} w={s.w} h={s.h} scale={s.scale ?? 1}
      fx={s.fx ?? 0.5} fy={s.fy ?? 0.5} dx={lerp(-dx / 2, dx / 2, dp)} dy={lerp(-dy / 2, dy / 2, dp)} />;
  } else if (s.kind === 'cut') {
    // matéria recortada do fundo branco: peça centrada no bloco escuro, ampliação limitada
    const k = Math.min(s.maxScale ?? 1.35, (s.w * 0.74) / s.iw!, (s.h * 0.74) / s.ih!);
    const w = s.iw! * k, h = s.ih! * k;
    const isPhoto = s.src!.endsWith('.jpg');
    body = (
      <AbsoluteFill style={{ background: s.color ?? C.grayDeep }}>
        <Img src={asset(s.src!)} style={{ position: 'absolute', left: u((s.w - w) / 2 + lerp(-dx / 2, dx / 2, dp)),
          top: u((s.h - h) / 2 + lerp(-dy / 2, dy / 2, dp)), width: u(w), height: u(h),
          boxShadow: isPhoto ? `${u(14)}px ${u(20)}px ${u(36)}px rgba(0,0,0,.45)` : undefined }} />
      </AbsoluteFill>
    );
  } else {
    body = (
      <AbsoluteFill style={{ background: s.color, alignItems: 'center', justifyContent: 'center' }}>
        {s.label && <Tag text={s.label} dark={s.color === C.green} p={labelP} />}
        {s.support && s.support.map((l, i) => (
          <Word key={i} size={46} weight={FONT.light} tracking={FONT.trackingSupport} color={C.white}>{l}</Word>
        ))}
      </AbsoluteFill>
    );
  }
  const pattern = s.pattern && labelP > 0 ? <div style={{ position: 'absolute', inset: 0, opacity: labelP }}><Pattern text={s.pattern} w={s.w} h={s.h} /></div> : null;
  return (
    <div style={{
      position: 'absolute', left: u(s.x), top: u(s.y), width: u(s.w), height: u(s.h), overflow: 'hidden',
      clipPath: pin < 1 ? `inset(${insetFor(s.inFrom ?? 'left', (1 - pin) * 100)})` : undefined,
      transform: pout > 0 ? `translate(${u(tx)}px, ${u(ty)}px)` : undefined,
    }}>{body}{pattern}</div>
  );
};

/** palavra como pequena informação dentro do bloco (suave: SemiBold, sem caixa alta pesada) */
export const Tag: React.FC<{ text: string; dark?: boolean; p?: number }> = ({ text, dark, p = 1 }) => {
  const u = useU();
  if (p <= 0) return null;
  return (
    <div style={{ opacity: p, transform: `translateY(${u(24) * (1 - p)}px)` }}>
      <Word size={112} weight={600} tracking="0.08em" color={dark ? C.grayDeep : C.white}>{text}</Word>
    </div>
  );
};

const Pattern: React.FC<{ text: string; w: number; h: number }> = ({ text, w, h }) => {
  const t = useT();
  const u = useU();
  const rows = Math.ceil(h / 130);
  const unit = 560;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {new Array(rows).fill(0).map((_, r) => {
        const v = (r % 2 ? -1 : 1) * (60 + 25 * (r % 3));
        const off = (((v * t) % unit) + unit) % unit - unit;
        return (
          <div key={r} style={{ position: 'absolute', top: u(30 + r * 130), left: u(off), display: 'flex', whiteSpace: 'nowrap' }}>
            {new Array(Math.ceil(w / unit) + 2).fill(0).map((_, i) => (
              <div key={i} style={{ width: u(unit), flex: 'none' }}>
                <Word size={50} weight={600} tracking="0.2em" color={`rgba(${C.whiteRGB},.55)`}>{text}</Word>
              </div>
            ))}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Mosaic: React.FC<{ tiles: TileSpec[]; t0: number; t1: number }> = ({ tiles, t0, t1 }) => (
  <AbsoluteFill>{tiles.map((s, i) => <Tile key={i} s={s} t0={t0} t1={t1} />)}</AbsoluteFill>
);

/** grid 4x3 */
export const G = { w: 875, h: 667, x: (c: number) => c * 875, y: (r: number) => r * 667 };
