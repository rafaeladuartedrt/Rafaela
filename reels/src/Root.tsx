import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import {StyleFrames} from './v2/StyleFrames';
import {BarreiraPreview} from './v2/BarreiraPreview';
import {ArrowActing} from './v2/ArrowActing';
import {DepthPreview} from './v2/DepthPreview';
import {OpeningPreview} from './v2/OpeningPreview';
import {OpeningPro} from './v2/OpeningPro';
import {Layouts} from './v2/Layouts';
import {Scene2} from './v2/Scene2';
import {Scene3, SCENE3_LEN} from './v2/Scene3';
import {Scene4, SCENE4_LEN} from './v2/Scene4';

export const Root: React.FC = () => (
  <>
    <Composition id="Reels" component={Video} durationInFrames={900} fps={30} width={1080} height={1920} defaultProps={{captions: false}} />
    <Composition id="ReelsLegendado" component={Video} durationInFrames={900} fps={30} width={1080} height={1920} defaultProps={{captions: true}} />
    <Composition id="SF" component={StyleFrames} durationInFrames={8} fps={30} width={1080} height={1920} />
    <Composition id="Barreira" component={BarreiraPreview} durationInFrames={75} fps={30} width={1080} height={1920} />
    <Composition id="Seta" component={ArrowActing} durationInFrames={210} fps={30} width={1080} height={1920} />
    <Composition id="Profundidade" component={DepthPreview} durationInFrames={110} fps={30} width={1080} height={1920} />
    <Composition id="Abertura" component={OpeningPreview} durationInFrames={180} fps={30} width={1080} height={1920} />
    <Composition id="AberturaPro" component={OpeningPro} durationInFrames={180} fps={30} width={1080} height={1920} defaultProps={{blur: true}} />
    <Composition id="AberturaProSemBlur" component={OpeningPro} durationInFrames={180} fps={30} width={1080} height={1920} defaultProps={{blur: false}} />
    <Composition id="Layouts" component={Layouts} durationInFrames={5} fps={30} width={1080} height={1920} />
    <Composition id="Cena2" component={Scene2} durationInFrames={338} fps={30} width={1080} height={1920} defaultProps={{blur: true}} />
    <Composition id="Cena2SemBlur" component={Scene2} durationInFrames={338} fps={30} width={1080} height={1920} defaultProps={{blur: false}} />
    <Composition id="Cena3" component={Scene3} durationInFrames={SCENE3_LEN} fps={30} width={1080} height={1920} defaultProps={{blur: true}} />
    <Composition id="Cena3SemBlur" component={Scene3} durationInFrames={SCENE3_LEN} fps={30} width={1080} height={1920} defaultProps={{blur: false}} />
    <Composition id="Cena4" component={Scene4} durationInFrames={SCENE4_LEN} fps={30} width={1080} height={1920} defaultProps={{blur: true}} />
    <Composition id="Cena4SemBlur" component={Scene4} durationInFrames={SCENE4_LEN} fps={30} width={1080} height={1920} defaultProps={{blur: false}} />
  </>
);
