import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import manifestJson from './generated/manifest.json';
import type { Manifest } from './core/types.ts';
import { Plate } from './components/Plate.tsx';

const manifest = manifestJson as unknown as Manifest;
export const integrityList = Object.entries(manifest.assets)
  .filter(([, a]) => a.present)
  .flatMap(([id, a]) => Object.keys(a.crops).map((c) => ({ id, c })));

// Cada quadro mostra um recorte a 100% (1 px nativo = 1 px de tela), com o mesmo
// componente usado na animacao, para comparar pixel a pixel com o PNG convertido.
export const IntegrityCheck: React.FC = () => {
  const f = useCurrentFrame();
  const e = integrityList[f];
  if (!e) return null;
  const a = manifest.assets[e.id];
  return (
    <AbsoluteFill style={{ background: '#ff00ff' }}>
      <Plate uid={`ic-${f}`} asset={a} crop={a.crops[e.c]} threshold={99} soft={0.05} />
    </AbsoluteFill>
  );
};
