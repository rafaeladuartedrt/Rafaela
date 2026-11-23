import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { C, FONT } from '../theme';
import { E, lerp, rand, seg, useT } from './time';
import { asset, useU } from './units';
import { Word } from './ui';

/**
 * Colagem em profundidade (ref. B). Cada peça tem uma profundidade z (0 = fundo, 1 = frente):
 * - parallax: deslocamento da câmera multiplicado por z (frente anda mais)
 * - escala aparente cresce com z; desfoque de profundidade nas camadas de trás
 * - sombra projetada coerente com a luz principal (alto-esquerda) só nas fotos
 */
export type Piece = {
  kind: 'photo' | 'headline';
  src: string; w: number; iw: number; ih: number; cx: number; cy: number; z: number;
  rot?: number; at: number; dur?: number; until?: number; dim?: number;
  /** desfoque fixo (px master) e borda esfumada, para fotos de fundo no espaço */
  blur?: number; feather?: boolean; shadow?: boolean;
};

export type Cam = { x: number; y: number; zoom: number };

const depthBlur = (z: number) => Math.max(0, (0.55 - z) * 11); // px master
const depthScale = (z: number) => 0.82 + z * 0.3;

export const PieceView: React.FC<{ p: Piece; cam: Cam }> = ({ p, cam }) => {
  const t = useT();
  const u = useU();
  const a = seg(t, p.at, p.at + (p.dur ?? 1.0), E.out);
  const b = p.until !== undefined ? 1 - seg(t, p.until, p.until + 0.6, E.soft) : 1;
  const op = a * b;
  if (op <= 0) return null;
  const s = depthScale(p.z) * cam.zoom ** (0.5 + p.z) * lerp(1.06, 1, a);
  const w = p.w * s, h = (p.w * p.ih / p.iw) * s;
  const x = 1750 + (p.cx - 1750) * cam.zoom ** p.z + cam.x * (0.25 + p.z);
  const y = 1000 + (p.cy - 1000) * cam.zoom ** p.z + cam.y * (0.25 + p.z) + lerp(30, 0, a) * (0.4 + p.z);
  const blur = p.blur ?? depthBlur(p.z);
  const fm = p.feather ? 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)' : undefined;
  const shadow = p.kind === 'photo' && p.shadow !== false && !p.feather
    ? `${u(22 + 30 * p.z)}px ${u(30 + 40 * p.z)}px ${u(50 + 50 * p.z)}px rgba(0,0,0,${0.35 + 0.25 * p.z})` : undefined;
  return (
    <div style={{
      position: 'absolute', left: u(x - w / 2), top: u(y - h / 2), width: u(w), height: u(h),
      transform: p.rot ? `rotate(${p.rot}deg)` : undefined, opacity: op * (p.dim ?? 1), boxShadow: shadow,
      filter: blur > 0.3 ? `blur(${u(blur)}px)` : undefined, WebkitMaskImage: fm, maskImage: fm,
    }}>
      <Img src={asset(p.src)} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
};

/** fundo de foto em tela cheia, recuado (z baixo), escurecido e desfocado */
export const Backdrop: React.FC<{ src: string; iw: number; ih: number; cam: Cam; op: number; blur?: number; dark?: number; fx?: number; fy?: number; scale?: number }> =
  ({ src, iw, ih, cam, op, blur = 6, dark = 0.55, fx = 0.5, fy = 0.5, scale = 1 }) => {
    const u = useU();
    if (op <= 0) return null;
    const k = Math.max(3700 / iw, 2150 / ih) * scale * cam.zoom ** 0.3;
    const w = iw * k, h = ih * k;
    return (
      <AbsoluteFill style={{ opacity: op, overflow: 'hidden' }}>
        <Img src={asset(src)} style={{ position: 'absolute', width: u(w), height: u(h), maxWidth: 'none',
          left: u((3500 - w) * fx + cam.x * 0.15), top: u((2000 - h) * fy + cam.y * 0.15), filter: `blur(${u(blur)}px)` }} />
        <AbsoluteFill style={{ background: `rgba(24,24,24,${dark})` }} />
      </AbsoluteFill>
    );
  };

/**
 * Palavra em faixa verde translúcida (ref. B): a faixa abre, as letras surgem fora de
 * ordem como carimbo, kicker pequeno abaixo. Vive numa camada de profundidade (z) e
 * acompanha o parallax.
 */
export const BandWord: React.FC<{
  word: string; cx: number; cy: number; z: number; cam: Cam; at: number; until: number;
  kicker?: string; seed?: number;
}> = ({ word, cx, cy, z, cam, at, until, kicker = '6º Prêmio Themis de Jornalismo', seed = 1 }) => {
  const t = useT();
  const u = useU();
  const band = seg(t, at, at + 0.45, E.main);
  const out = 1 - seg(t, until, until + 0.45, E.soft);
  if (band <= 0 || out <= 0) return null;
  const x = 1750 + (cx - 1750) * cam.zoom ** z + cam.x * (0.25 + z);
  const y = 1000 + (cy - 1000) * cam.zoom ** z + cam.y * (0.25 + z);
  const letters = word.split('');
  const order = letters.map((_, i) => i).sort((a, b) => rand(a + seed * 9.1) - rand(b + seed * 9.1));
  const k = seg(t, at + 0.75, at + 1.25, E.out);
  return (
    <div style={{ position: 'absolute', left: u(x), top: u(y), transform: `translate(-50%, -50%) scale(${depthScale(z)})`, opacity: out,
      display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', padding: `${u(18)}px ${u(70)}px` }}>
        <div style={{ position: 'absolute', inset: 0, background: `rgba(${C.greenRGB},.7)`, transform: `scaleX(${band})`, transformOrigin: 'left center' }} />
        <div style={{ position: 'relative' }}>
          <Word size={118} weight={600} tracking="0.1em" color={C.grayDeep}>
            {letters.map((ch, i) => {
              const at2 = at + 0.3 + order.indexOf(i) * 0.07;
              const p = seg(t, at2, at2 + 0.08, E.out);
              return <span key={i} style={{ opacity: p, display: 'inline-block', transform: `scale(${1 + 0.1 * (1 - seg(t, at2, at2 + 0.18, E.out))})` }}>{ch}</span>;
            })}
          </Word>
        </div>
      </div>
      {kicker && (
        <div style={{ marginTop: u(22), opacity: k, transform: `translateY(${u(14) * (1 - k)}px)` }}>
          <Word size={38} weight={FONT.light} tracking={FONT.trackingSupport} color={C.white}>{kicker}</Word>
        </div>
      )}
    </div>
  );
};

/** light leak suave: duas manchas de luz quente/verde atravessando (camada de luz, screen) */
export const LightLeak: React.FC<{ a: number; b: number; strength?: number }> = ({ a, b, strength = 0.16 }) => {
  const t = useT();
  const u = useU();
  const p = seg(t, a, b, E.soft);
  const env = Math.sin(Math.PI * p);
  if (env <= 0.001) return null;
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: env * strength, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', width: u(2600), height: u(2600), left: u(lerp(-1800, 2600, p)), top: u(-900), borderRadius: '50%',
        background: `radial-gradient(circle, rgba(255,236,200,.9) 0%, rgba(255,214,160,.35) 35%, rgba(0,0,0,0) 70%)` }} />
      <div style={{ position: 'absolute', width: u(2000), height: u(2000), left: u(lerp(3200, -1200, p)), top: u(900), borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${C.greenRGB},.8) 0%, rgba(${C.greenRGB},.25) 38%, rgba(0,0,0,0) 70%)` }} />
    </AbsoluteFill>
  );
};

/* ---------- espaço contínuo: um travelling único atravessa a colagem ---------- */
/** fator de parallax por profundidade: fundo anda devagar, frente anda mais */
export const pf = (z: number) => 0.45 + 0.7 * z;
export const NEUTRAL: Cam = { x: 0, y: 0, zoom: 1 };
/** posição no mundo para que o elemento esteja em screenX quando a câmera estiver em camAt */
export const worldX = (camAt: number, screenX: number, z: number) => camAt + (screenX - 1750) / pf(z);
export const screenX = (wx: number, camX: number, z: number) => 1750 + (wx - camX) * pf(z);
