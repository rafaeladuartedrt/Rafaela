import { interpolate, spring, SpringConfig } from 'remotion';

const SPRING_CONFIG_SNAPPY: SpringConfig = {
  damping: 18,
  mass: 0.6,
  stiffness: 200,
  overshootClamping: false,
};

const SPRING_CONFIG_SMOOTH: SpringConfig = {
  damping: 22,
  mass: 0.8,
  stiffness: 120,
  overshootClamping: false,
};

export function fadeIn(frame: number, startFrame: number, durationFrames: number): number {
  return interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export function fadeOut(frame: number, startFrame: number, durationFrames: number): number {
  return interpolate(frame, [startFrame, startFrame + durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export function slideUp(frame: number, startFrame: number, fps: number, distance = 60): number {
  const progress = spring({ frame: frame - startFrame, fps, config: SPRING_CONFIG_SNAPPY });
  return interpolate(progress, [0, 1], [distance, 0]);
}

export function slideDown(frame: number, startFrame: number, fps: number, distance = 60): number {
  const progress = spring({ frame: frame - startFrame, fps, config: SPRING_CONFIG_SNAPPY });
  return interpolate(progress, [0, 1], [-distance, 0]);
}

export function scaleIn(frame: number, startFrame: number, fps: number): number {
  return spring({ frame: frame - startFrame, fps, config: SPRING_CONFIG_SMOOTH });
}

export function countUp(frame: number, startFrame: number, durationFrames: number, from: number, to: number): number {
  return Math.round(
    interpolate(frame, [startFrame, startFrame + durationFrames], [from, to], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
}

export function pulseScale(frame: number, frequency = 0.08, amplitude = 0.03): number {
  return 1 + Math.sin(frame * frequency * Math.PI * 2) * amplitude;
}

export function glowOpacity(frame: number, frequency = 0.05, base = 0.5, range = 0.3): number {
  return base + Math.sin(frame * frequency * Math.PI * 2) * range;
}

export function typingProgress(frame: number, startFrame: number, charCount: number, fps: number): number {
  const duration = (charCount / 8) * fps; // ~8 chars/s
  return Math.floor(
    interpolate(frame, [startFrame, startFrame + duration], [0, charCount], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
}
