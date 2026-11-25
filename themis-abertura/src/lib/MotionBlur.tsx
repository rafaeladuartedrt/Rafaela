import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { TimeProvider, useT } from './time';

/**
 * Motion blur de obturador 180°: renderiza o subtree em N sub-instantes dentro de
 * meio intervalo de frame e soma com plus-lighter (média exata, alfa incluído).
 * Só liga dentro das janelas de movimento rápido, para não pesar o render.
 */
export const MotionBlur: React.FC<{
  children: React.ReactNode;
  windows: [number, number][];
  samples?: number;
  shutter?: number;
}> = ({ children, windows, samples = 7, shutter = 180 }) => {
  const t = useT();
  const { fps } = useVideoConfig();
  const active = windows.some(([a, b]) => t >= a && t <= b);
  if (!active) return <TimeProvider t={t}>{children}</TimeProvider>;
  const open = shutter / 360 / fps;
  return (
    <AbsoluteFill style={{ isolation: 'isolate' }}>
      {new Array(samples).fill(0).map((_, i) => {
        const ts = t + (i / (samples - 1) - 0.5) * open;
        return (
          <AbsoluteFill key={i} style={{ mixBlendMode: 'plus-lighter', opacity: 1 / samples }}>
            <TimeProvider t={ts}>{children}</TimeProvider>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
