import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C } from '../theme';
import { E, lerp, seg, T, useT } from '../lib/time';
import { useU } from '../lib/units';
import { useVideoConfig } from 'remotion';

/** Linha verde fina no centro (eco das linhas laterais do logo). Estado do frame 0 = estado final. */
export const LINE_L0 = 520;
export const GreenLine: React.FC = () => {
  const t = useT();
  const u = useU();
  const { fps } = useVideoConfig();
  const last = T - 1 / fps; // último frame do loop
  let len = 0, op = 0;
  if (t <= 3.0) {
    len = lerp(LINE_L0, 2800, seg(t, 0.25, 2.85, E.main));
    op = 1;
  } else if (t >= 29.5) {
    const p = seg(t, 29.5, last, E.soft);
    len = LINE_L0 * p; op = p;
  }
  if (op <= 0) return null;
  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute', left: u(1750 - len / 2), top: u(1000 - 2.5), width: u(len), height: u(5),
        background: C.green, opacity: op,
        boxShadow: `0 0 ${u(22)}px rgba(${C.greenRGB},.65), 0 0 ${u(70)}px rgba(${C.greenRGB},.25)`,
      }} />
    </AbsoluteFill>
  );
};
