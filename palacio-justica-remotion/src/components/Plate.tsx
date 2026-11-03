import React from 'react';
import { staticFile } from 'remotion';
import type { AssetInfo, CropInfo, RevealType } from '../core/types.ts';

// Exibe um recorte da imagem original. O recorte e feito pela janela do <svg>
// (viewport) e a revelacao por mascara alfa; os pixels da imagem nunca sao alterados.
// threshold: nivel de revelacao T (0 = nada, >= 1 + soft = tudo). soft em unidades do mapa.
export const Plate: React.FC<{
  uid: string; asset: AssetInfo; crop: CropInfo; reveal?: RevealType; threshold: number; soft: number;
}> = ({ uid, asset, crop, reveal, threshold, soft }) => {
  const full = !reveal || threshold >= 1 + soft;
  if (threshold <= 0 && reveal) return null;
  const map = reveal ? crop.maps?.[reveal] : undefined;
  const img = (
    <image href={staticFile(asset.src!)} x={-crop.x} y={-crop.y} width={asset.w} height={asset.h}
      preserveAspectRatio="none" style={{ imageRendering: 'auto' }} />
  );
  return (
    <svg width={crop.w} height={crop.h} viewBox={`0 0 ${crop.w} ${crop.h}`} style={{ position: 'absolute', left: 0, top: 0, display: 'block' }}>
      {full || !map ? img : (
        <>
          <defs>
            <filter id={`f-${uid}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${-1 / soft} 0 0 0 ${threshold / soft}`} />
            </filter>
            <mask id={`m-${uid}`} maskUnits="userSpaceOnUse" x={0} y={0} width={crop.w} height={crop.h} style={{ maskType: 'alpha' }}>
              <image href={staticFile(map)} x={0} y={0} width={crop.w} height={crop.h} preserveAspectRatio="none" filter={`url(#f-${uid})`} />
            </mask>
          </defs>
          <g mask={`url(#m-${uid})`}>{img}</g>
        </>
      )}
    </svg>
  );
};
