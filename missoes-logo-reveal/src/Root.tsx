import React from 'react';
import {Composition} from 'remotion';
import {Reveal, RevealProps} from './Reveal';

// Cada formato é recomposto na própria resolução (vetor renderizado nativamente).
export const FORMATS = [
	{id: 'Reveal-3840x2160', width: 3840, height: 2160, scale: 1.3},
	{id: 'Reveal-1920x1080', width: 1920, height: 1080, scale: 0.65},
	{id: 'Reveal-1080x1920', width: 1080, height: 1920, scale: 0.41},
	{id: 'Reveal-1080x1080', width: 1080, height: 1080, scale: 0.41},
] as const;

export const RemotionRoot: React.FC = () => (
	<>
		{FORMATS.map((f) => (
			<Composition<any, RevealProps>
				key={f.id}
				id={f.id}
				component={Reveal}
				durationInFrames={360}
				fps={60}
				width={f.width}
				height={f.height}
				defaultProps={{scale: f.scale, sub: 0}}
			/>
		))}
	</>
);
