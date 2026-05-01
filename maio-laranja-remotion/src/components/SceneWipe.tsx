import React from 'react';
import { interpolate } from 'remotion';
import { COLORS, WIPE_DURATION } from '../constants';

interface SceneWipeProps {
  frame: number;       // frame global
  triggerFrame: number; // frame em que o wipe começa
  direction?: 'right' | 'left';
}

export const SceneWipe: React.FC<SceneWipeProps> = ({
  frame,
  triggerFrame,
  direction = 'right',
}) => {
  const localFrame = frame - triggerFrame;

  if (localFrame < 0 || localFrame > WIPE_DURATION * 2) return null;

  const half = WIPE_DURATION;

  // Primeira metade: laranja entra
  const enterProgress = interpolate(localFrame, [0, half], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Segunda metade: laranja sai
  const exitProgress = interpolate(localFrame, [half, half * 2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const enterX = direction === 'right'
    ? interpolate(enterProgress, [0, 1], [-1080, 0])
    : interpolate(enterProgress, [0, 1], [1080, 0]);

  const exitX = direction === 'right'
    ? interpolate(exitProgress, [0, 1], [0, 1080])
    : interpolate(exitProgress, [0, 1], [0, -1080]);

  const translateX = localFrame <= half ? enterX : exitX;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(135deg, ${COLORS.laranjaPrincipal} 0%, ${COLORS.laranjaQueimado} 100%)`,
        transform: `translateX(${translateX}px)`,
        zIndex: 100,
      }}
    />
  );
};
