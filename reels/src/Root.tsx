import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import {StyleFrames} from './v2/StyleFrames';
import {BarreiraPreview} from './v2/BarreiraPreview';
import {ArrowActing} from './v2/ArrowActing';

export const Root: React.FC = () => (
  <>
    <Composition id="Reels" component={Video} durationInFrames={900} fps={30} width={1080} height={1920} defaultProps={{captions: false}} />
    <Composition id="ReelsLegendado" component={Video} durationInFrames={900} fps={30} width={1080} height={1920} defaultProps={{captions: true}} />
    <Composition id="SF" component={StyleFrames} durationInFrames={8} fps={30} width={1080} height={1920} />
    <Composition id="Barreira" component={BarreiraPreview} durationInFrames={75} fps={30} width={1080} height={1920} />
    <Composition id="Seta" component={ArrowActing} durationInFrames={210} fps={30} width={1080} height={1920} />
  </>
);
