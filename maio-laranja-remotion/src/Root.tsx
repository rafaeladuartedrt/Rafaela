import React from 'react';
import { Composition } from 'remotion';
import { MaioLaranja } from './MaioLaranja';
import { DURACAO_TOTAL, FPS, HEIGHT, WIDTH } from './constants';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MaioLaranja"
        component={MaioLaranja}
        durationInFrames={DURACAO_TOTAL}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
