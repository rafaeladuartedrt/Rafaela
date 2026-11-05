import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BLUE, ACCENT, Words, RubberArrow} from './kit';

const IDS = ['LE', 'LF'];
export const Layouts: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: BLUE}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <rect width={1080} height={1920} fill={BLUE} />
        <Words id={IDS[f] ?? 'LE'} />
        {f === 0 ? <RubberArrow x={820} y={930} rot={-24} scale={1.6} fill={ACCENT} /> : null}
      </svg>
    </AbsoluteFill>
  );
};
