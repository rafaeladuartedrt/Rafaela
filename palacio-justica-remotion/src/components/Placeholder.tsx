import React from 'react';
import type { AssetInfo, CropInfo } from '../core/types.ts';
import { GRAPHITE } from '../core/config.ts';

// Moldura provisoria para arquivo ainda nao recebido (so aparece na previa).
export const Placeholder: React.FC<{ asset: AssetInfo; crop: CropInfo; cropName: string; progress: number; dir: 'up' | 'right' | 'fade' }> = ({ asset, crop, cropName, progress, dir }) => {
  const p = Math.max(0, Math.min(1, progress));
  const mask = dir === 'fade' ? undefined
    : dir === 'up'
      ? `linear-gradient(to top, #000 ${p * 100 - 4}%, transparent ${p * 100 + 4}%)`
      : `linear-gradient(to right, #000 ${p * 100 - 4}%, transparent ${p * 100 + 4}%)`;
  const fs = Math.max(14, Math.min(crop.w, crop.h) * 0.06);
  return (
    <div style={{
      position: 'absolute', left: 0, top: 0, width: crop.w, height: crop.h, boxSizing: 'border-box',
      border: `${Math.max(2, fs * 0.08)}px dashed ${GRAPHITE}88`, opacity: dir === 'fade' ? p : 1,
      background: `repeating-linear-gradient(45deg, #00000008 0 ${fs * 0.5}px, transparent ${fs * 0.5}px ${fs}px), #FBF9F4`,
      WebkitMaskImage: mask, maskImage: mask,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: GRAPHITE,
      fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: fs,
    }}>
      <div style={{ fontSize: fs * 0.7, letterSpacing: '0.2em', opacity: 0.6 }}>ARQUIVO PENDENTE · ITEM {asset.item}</div>
      <div style={{ fontSize: fs, marginTop: fs * 0.4, fontWeight: 400 }}>{asset.file}</div>
      <div style={{ fontSize: fs * 0.7, marginTop: fs * 0.3, opacity: 0.6 }}>recorte: {cropName}</div>
    </div>
  );
};
