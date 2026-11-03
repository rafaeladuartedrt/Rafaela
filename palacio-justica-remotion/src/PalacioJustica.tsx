import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import manifestJson from './generated/manifest.json';
import type { Manifest } from './core/types.ts';
import { buildTimeline } from './core/timeline.ts';
import { MUSIC_VOLUME, SFX_VOLUME, SHOW_TEXT } from './core/config.ts';
import { Paper } from './components/Paper.tsx';
import { ShotLayer } from './components/ShotLayer.tsx';
import { Caption, Ending } from './components/Overlay.tsx';

const manifest = manifestJson as unknown as Manifest;

export const PalacioJustica: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const tl = useMemo(() => buildTimeline(manifest), []);
  const active = tl.shots.filter((s) => f >= s.start && f < s.end);
  const lapis = manifest.optional.lapis;
  return (
    <AbsoluteFill>
      <Paper id="base" />
      {active.map((s) => <ShotLayer key={s.id} shot={s} m={manifest} f={f} W={W} H={H} />)}
      {SHOW_TEXT && tl.texts.map((c) => <Caption key={c.text} cue={c} f={f} W={W} H={H} />)}
      <Ending f={f} from={tl.ending.from} title={tl.ending.title} showText={SHOW_TEXT} logo={manifest.optional.logo} W={W} H={H} />
      {manifest.optional.trilha && (
        <Audio src={staticFile(manifest.optional.trilha)}
          volume={(fr) => MUSIC_VOLUME * interpolate(fr, [0, 20, durationInFrames - 45, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      )}
      {lapis && tl.shots.flatMap((s) => s.items.filter((it) => it.reveal && it.reveal.type.startsWith('stroke')).map((it, i) => (
        <Sequence key={`${s.id}-${i}`} from={s.start + it.reveal!.from} durationInFrames={Math.max(10, it.reveal!.to - it.reveal!.from)}>
          <Audio src={staticFile(lapis)} volume={SFX_VOLUME} />
        </Sequence>
      )))}
    </AbsoluteFill>
  );
};
