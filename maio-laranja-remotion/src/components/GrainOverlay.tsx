import React from 'react';
import { useCurrentFrame } from 'remotion';

interface GrainOverlayProps {
  opacity?: number;
  animated?: boolean;
}

export const GrainOverlay: React.FC<GrainOverlayProps> = ({
  opacity = 0.04,
  animated = true,
}) => {
  const frame = useCurrentFrame();
  // Muda o seed a cada 2 frames para grain animado
  const seed = animated ? Math.floor(frame / 2) : 0;

  const svgNoise = `
    <svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>
      <filter id='noise'>
        <feTurbulence
          type='fractalNoise'
          baseFrequency='0.85'
          numOctaves='4'
          seed='${seed}'
          stitchTiles='stitch'
        />
        <feColorMatrix type='saturate' values='0' />
      </filter>
      <rect width='300' height='300' filter='url(#noise)' opacity='1' />
    </svg>
  `;

  const encoded = `data:image/svg+xml;utf8,${encodeURIComponent(svgNoise)}`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url("${encoded}")`,
        backgroundRepeat: 'repeat',
        opacity,
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
      }}
    />
  );
};
