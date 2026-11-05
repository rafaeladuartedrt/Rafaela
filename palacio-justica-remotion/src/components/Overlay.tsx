import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import type { TextCue } from '../core/types.ts';
import { easeSoft, prog } from '../core/easing.ts';
import { GRAPHITE, SAFE_BOTTOM, SAFE_TOP } from '../core/config.ts';
import { Paper } from './Paper.tsx';

const portraitSafe = (W: number, H: number) => (H > W ? { top: SAFE_TOP * (H / 1920), bottom: SAFE_BOTTOM * (H / 1920) } : { top: H * 0.08, bottom: H * 0.1 });

export const Caption: React.FC<{ cue: TextCue; f: number; W: number; H: number }> = ({ cue, f, W, H }) => {
  const a = prog(f, cue.from, cue.from + 20, easeSoft) * (1 - prog(f, cue.to - 18, cue.to, easeSoft));
  if (a <= 0) return null;
  const rise = 26 * (1 - prog(f, cue.from, cue.from + 26, easeSoft));
  const safe = portraitSafe(W, H);
  const k = Math.min(W, H) / 1080;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: safe.top + 40 * k, textAlign: 'center', opacity: a,
      transform: `translateY(${rise}px)`, fontFamily: 'Inter', fontWeight: cue.weight, fontSize: cue.size * k,
      letterSpacing: '0.04em', color: GRAPHITE }}>
      <span style={{ background: '#F4F0E6E6', padding: `${10 * k}px ${28 * k}px` }}>{cue.text}</span>
    </div>
  );
};

export const Ending: React.FC<{ f: number; from: number; title: string; showText: boolean; logo: string | null; W: number; H: number }> = ({ f, from, title, showText, logo, W, H }) => {
  const a = prog(f, from, from + 30, easeSoft);
  if (a <= 0) return null;
  const t = prog(f, from + 14, from + 40, easeSoft);
  const k = Math.min(W, H) / 1080;
  const safe = portraitSafe(W, H);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Paper id="ending" />
      <AbsoluteFill style={{ top: safe.top, bottom: safe.bottom, height: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 48 * k }}>
        {showText && (
          <div style={{ opacity: t, transform: `translateY(${18 * (1 - t)}px)`, fontFamily: 'Inter', fontWeight: 300, fontSize: 84 * k, letterSpacing: '0.05em', color: GRAPHITE }}>{title}</div>
        )}
        {showText && <div style={{ width: 120 * k * t, height: 2, background: GRAPHITE, opacity: 0.5 }} />}
        {logo && <Img src={staticFile(logo)} style={{ maxWidth: 420 * k, maxHeight: 220 * k, opacity: t }} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
