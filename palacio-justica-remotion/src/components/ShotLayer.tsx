import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, Sequence } from 'remotion';
import type { Item, Manifest, Shot } from '../core/types.ts';
import { cameraAt } from '../core/camera.ts';
import { easeSoft, prog } from '../core/easing.ts';
import {
  ACCENT, BLOCK_OPACITY, GRAPHITE, REVEAL_SOFT_PX, SHOW_PENCIL_GUIDE, SHOW_PLACEHOLDERS, USE_COLOR_BLOCKS,
} from '../core/config.ts';
import { Paper } from './Paper.tsx';
import { Plate } from './Plate.tsx';
import { Placeholder } from './Placeholder.tsx';

const NOISE_W = 0.16; // igual ao prepare_assets.py

// nivel de revelacao T e borda macia (unidades do mapa) para um item
export function revealState(it: Item, rel: number, cropW: number, cropH: number, z: number) {
  if (!it.reveal) return { T: 99, soft: 0.05, p: 1 };
  const { type, from, to } = it.reveal;
  const p = prog(rel, from, to, easeSoft);
  const along = type === 'right' ? cropW : cropH;
  const screenLen = along * it.s * z;
  const soft = type.startsWith('luma') ? 0.1 : Math.min(0.25, Math.max(0.004, (REVEAL_SOFT_PX / Math.max(1, screenLen)) * (1 - NOISE_W)));
  return { T: p * (1 + soft) + (p >= 1 ? 1 : 0), soft, p };
}

const ItemView: React.FC<{ uid: string; it: Item; m: Manifest; rel: number; z: number }> = ({ uid, it, m, rel, z }) => {
  const asset = m.assets[it.asset];
  const crop = asset.crops[it.crop];
  const { T, soft, p } = revealState(it, rel, crop.w, crop.h, z);
  if (!asset.present && !SHOW_PLACEHOLDERS) return null;
  const pad = Math.max(crop.w, crop.h) * 0.12;
  const appear = it.reveal ? Math.min(1, p * 4) : 1;
  return (
    <div style={{ position: 'absolute', left: it.x, top: it.y, width: crop.w, height: crop.h, transform: `scale(${it.s})`, transformOrigin: '0 0' }}>
      {/* sombra e moldura: camadas graficas separadas, abaixo da imagem */}
      {it.frame ? (
        <div style={{ position: 'absolute', left: -pad, top: -pad, width: crop.w + 2 * pad, height: crop.h + 2 * pad, opacity: appear,
          background: '#FBF8F1', border: `${1.2 / (z * it.s)}px solid ${GRAPHITE}55`, boxShadow: `0 ${6 / (z * it.s)}px ${24 / (z * it.s)}px #0000001a` }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, opacity: appear, boxShadow: `0 ${8 / (z * it.s)}px ${30 / (z * it.s)}px #00000014` }} />
      )}
      {asset.present ? (
        <Plate uid={uid} asset={asset} crop={crop} reveal={it.reveal?.type} threshold={T} soft={soft} />
      ) : (
        <Placeholder asset={asset} crop={crop} cropName={it.crop} progress={it.reveal ? p : 1}
          dir={!it.reveal ? 'fade' : it.reveal.type === 'right' ? 'right' : it.reveal.type.startsWith('luma') ? 'fade' : 'up'} />
      )}
      {/* linha guia de lapis na frente da area revelada */}
      {SHOW_PENCIL_GUIDE && it.reveal && (it.reveal.type === 'up' || it.reveal.type === 'right') && p > 0.01 && p < 0.99 && (() => {
        const g = Math.min(1, Math.max(0, (T - NOISE_W * 0.5) / (1 - NOISE_W)));
        const th = 2.2 / (z * it.s);
        const op = 0.45 * Math.sin(Math.PI * p);
        return it.reveal!.type === 'up'
          ? <div style={{ position: 'absolute', left: -crop.w * 0.03, width: crop.w * 1.06, top: crop.h * (1 - g), height: th, background: GRAPHITE, opacity: op }} />
          : <div style={{ position: 'absolute', top: -crop.h * 0.03, height: crop.h * 1.06, left: crop.w * g, width: th, background: GRAPHITE, opacity: op }} />;
      })()}
      {/* blocos de cor ACCENT: camada propria, multiply, wipe suave */}
      {USE_COLOR_BLOCKS && it.blocks?.map((b) => {
        const geo = crop.blocks[b.name];
        if (!geo?.rect) return null;
        const bp = prog(rel, b.from, b.from + 20, easeSoft);
        const out = b.to !== undefined ? 1 - prog(rel, b.to, b.to + 18) : 1;
        if (bp <= 0 || out <= 0) return null;
        const [x, y, w, h] = geo.rect;
        const clip = b.dir === 'right' ? `inset(0 ${(1 - bp) * 100}% 0 0)` : `inset(${(1 - bp) * 100}% 0 0 0)`;
        return <div key={b.name} style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: ACCENT,
          opacity: BLOCK_OPACITY * out, mixBlendMode: 'multiply', clipPath: clip }} />;
      })}
    </div>
  );
};

export const ShotLayer: React.FC<{ shot: Shot; m: Manifest; f: number; W: number; H: number }> = ({ shot, m, f, W, H }) => {
  const rel = f - shot.start;
  const { inT } = shot;
  const pin = inT.dur > 0 ? prog(rel, 0, inT.dur, easeSoft) : 1;
  const blur = inT.blur ? inT.blur * (1 - prog(rel, 0, inT.dur, easeSoft)) : 0;
  const style: React.CSSProperties = {};
  if (inT.type === 'dissolve') style.opacity = pin;
  if (inT.type === 'iris') {
    const rr = pin * Math.hypot(W, H) * 0.6;
    const mk = `radial-gradient(circle at 50% 50%, #000 ${Math.max(0, rr - 120)}px, transparent ${rr}px)`;
    style.WebkitMaskImage = mk; style.maskImage = mk;
  }
  if (blur > 0.05) style.filter = `blur(${blur}px)`;

  if (shot.video) {
    return (
      <AbsoluteFill style={style}>
        <Sequence from={shot.start}><OffthreadVideo src={staticFile(shot.video)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></Sequence>
      </AbsoluteFill>
    );
  }
  const cam = cameraAt(shot, f, W, H);
  const board = `translate(${W / 2}px, ${H / 2}px) rotate(${cam.r}deg) scale(${cam.z}) translate(${-cam.cx}px, ${-cam.cy}px)`;
  // parallax: linhas de construcao em primeiro plano andam mais rapido que a imagem
  let guides: React.ReactNode = null;
  if (shot.parallax) {
    const c0 = cameraAt(shot, shot.start, W, H);
    const dx = (cam.cx - c0.cx) * cam.z * (shot.parallax - 1);
    guides = (
      <AbsoluteFill style={{ transform: `translateX(${-dx}px)` }}>
        {[-0.15, 0.08, 0.92, 1.15].map((x, i) => (
          <div key={i} style={{ position: 'absolute', left: W * x, top: -H * 0.1, width: 1.4, height: H * 1.2, background: GRAPHITE, opacity: 0.22 }} />
        ))}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={style}>
      <Paper id={shot.id} />
      <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: board }}>
        {shot.items.map((it, i) => <ItemView key={i} uid={`${shot.id}-${i}`} it={it} m={m} rel={rel} z={cam.z} />)}
      </div>
      {guides}
    </AbsoluteFill>
  );
};
