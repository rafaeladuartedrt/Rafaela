import React from 'react';
import {Series} from 'remotion';
import {OpeningPro} from './OpeningPro';
import {Scene2} from './Scene2';
import {Scene3, SCENE3_LEN} from './Scene3';
import {Scene4, SCENE4_LEN} from './Scene4';
import {Scene5, SCENE5_LEN} from './Scene5';
import {WARP, warpLen} from './warp';

// Vídeo completo: as cinco cenas em sequência, cada uma começando no último quadro da anterior
export const SRC = {s1: 144, s2: 338, s3: SCENE3_LEN, s4: SCENE4_LEN, s5: SCENE5_LEN};
export const LENS = {s1: warpLen(SRC.s1, WARP.s1), s2: warpLen(SRC.s2, WARP.s2), s3: warpLen(SRC.s3, WARP.s3), s4: warpLen(SRC.s4, WARP.s4), s5: warpLen(SRC.s5, WARP.s5)};
export const STARTS = {s1: 0, s2: LENS.s1, s3: LENS.s1 + LENS.s2, s4: LENS.s1 + LENS.s2 + LENS.s3, s5: LENS.s1 + LENS.s2 + LENS.s3 + LENS.s4};
export const FULL_LEN = LENS.s1 + LENS.s2 + LENS.s3 + LENS.s4 + LENS.s5;

export const Full: React.FC<{blur?: boolean}> = ({blur = true}) => (
  <Series>
    <Series.Sequence durationInFrames={LENS.s1}><OpeningPro blur={blur} segs={WARP.s1} /></Series.Sequence>
    <Series.Sequence durationInFrames={LENS.s2}><Scene2 blur={blur} segs={WARP.s2} /></Series.Sequence>
    <Series.Sequence durationInFrames={LENS.s3}><Scene3 blur={blur} segs={WARP.s3} /></Series.Sequence>
    <Series.Sequence durationInFrames={LENS.s4}><Scene4 blur={blur} segs={WARP.s4} /></Series.Sequence>
    <Series.Sequence durationInFrames={LENS.s5}><Scene5 blur={blur} segs={WARP.s5} /></Series.Sequence>
  </Series>
);
