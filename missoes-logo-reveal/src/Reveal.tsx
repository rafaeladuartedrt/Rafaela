import React from 'react';
import {Easing, useCurrentFrame, useVideoConfig} from 'remotion';
import {LOGO} from './logoData';

// Coordenadas em pontos do PDF original (y para baixo, como no SVG gerado).
// Centro do lockup (bbox medido sobre o render do PDF) e centro do símbolo.
const LOCKUP_C = {x: 1177.0, y: 472.625};
const SYMBOL_C = {x: 580.2, y: 472.3};

export const HOLD_START = 4.3; // a partir daqui o quadro é o logo original, intocado

export type RevealProps = {
	scale: number; // px por ponto do PDF no quadro final
	sub: number; // deslocamento de subquadro (motion blur por acumulação)
};

// ---------------------------------------------------------------- utilidades

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const prog = (t: number, start: number, dur: number) => clamp01((t - start) / dur);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// easeOutBack com intensidade ajustável (s = 1.0 -> overshoot de ~3,7%).
const outBack = (s: number) => (x: number) => {
	const y = x - 1;
	return 1 + (s + 1) * y * y * y + s * y * y;
};
const inOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// Curvas ajustadas uma a uma.
const E = {
	dotIn: Easing.bezier(0.18, 0.9, 0.32, 1),
	dotGrow: Easing.bezier(0.55, 0, 0.3, 1),
	dock: outBack(1.0),
	spin: Easing.bezier(0.3, 0, 0.2, 1),
	wipe400: Easing.bezier(0.6, 0, 0.25, 1),
	wipeCross: Easing.bezier(0.5, 0, 0.2, 1),
	wipeChurch: Easing.bezier(0.55, 0, 0.3, 1),
	wipePattern: Easing.bezier(0.45, 0, 0.2, 1),
	strokeHead: Easing.bezier(0.1, 0.7, 0.3, 1),
	strokeTail: Easing.bezier(0.6, 0, 0.4, 1),
	line1: Easing.bezier(0.16, 1, 0.3, 1),
	line2: Easing.bezier(0.2, 1, 0.32, 1),
	line3: outBack(1.2),
	rot: Easing.bezier(0.25, 0.9, 0.3, 1),
	line4Fade: Easing.bezier(0.33, 0, 0.2, 1),
	line4Move: Easing.bezier(0.2, 0.8, 0.2, 1),
};

type Item = (typeof LOGO.items)[number];
const items = LOGO.items as readonly Item[];
const byLayer = (layer: string) => items.filter((it) => it.layer === layer);

const Raw: React.FC<{items: readonly Item[]}> = ({items: list}) => (
	<g dangerouslySetInnerHTML={{__html: list.map((i) => i.svg).join('')}} />
);

// --------------------------------------------------------------- os 4 blocos

type BlockDef = {
	layer: string;
	color: string;
	centroid: {x: number; y: number};
	quadrant: {x: number; y: number};
	launch: number;
	rot0: number;
	outer: {x: number; y: number}; // vértice externo, origem dos traços de impacto
	strokeColors: [string, string];
};

const OLIVE = '#9A9F30';
const MUSTARD = '#E7A22B';
const CORAL = '#E76847';
const RUST = '#BB5108';

const BLOCKS: BlockDef[] = [
	{layer: 'blockOlive', color: OLIVE, centroid: {x: 401.7, y: 292.2}, quadrant: {x: -1, y: -1}, launch: 0.4, rot0: -36, outer: {x: 168, y: 150}, strokeColors: [OLIVE, CORAL]},
	{layer: 'blockMustard', color: MUSTARD, centroid: {x: 804.0, y: 330.0}, quadrant: {x: 1, y: -1}, launch: 0.5, rot0: -30, outer: {x: 992, y: 158}, strokeColors: [MUSTARD, OLIVE]},
	{layer: 'blockCoral', color: CORAL, centroid: {x: 376.7, y: 607.5}, quadrant: {x: -1, y: 1}, launch: 0.6, rot0: -42, outer: {x: 150, y: 798}, strokeColors: [CORAL, RUST]},
	{layer: 'blockRust', color: RUST, centroid: {x: 803.4, y: 640.8}, quadrant: {x: 1, y: 1}, launch: 0.7, rot0: -33, outer: {x: 1018, y: 735}, strokeColors: [RUST, MUSTARD]},
];

const DOT_R = 30;
const FULL_R = 360;
const DOCK_DUR = 0.66;
const DOCK_HIT = 0.5 * DOCK_DUR; // easeOutBack(s=1) cruza 1 na metade
const DOT_SPREAD = 58;
const SWING = 980;

const rotate = (v: {x: number; y: number}, deg: number) => {
	const a = (deg * Math.PI) / 180;
	return {x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a)};
};
const norm = (v: {x: number; y: number}) => {
	const l = Math.hypot(v.x, v.y);
	return {x: v.x / l, y: v.y / l};
};

// Os pontos nascem agrupados no centro e giram levemente antes de partir.
const clusterAngle = (t: number) => -110 * (1 - E.spin(prog(t, 0, 0.75)));

const blockState = (b: BlockDef, i: number, t: number) => {
	const dotT = prog(t, i * 0.05, 0.25);
	const dotPos = (() => {
		const q = rotate({x: b.quadrant.x * DOT_SPREAD, y: b.quadrant.y * DOT_SPREAD}, clusterAngle(t));
		return {x: SYMBOL_C.x + q.x, y: SYMBOL_C.y + q.y};
	})();
	const p0 = {x: dotPos.x - b.centroid.x, y: dotPos.y - b.centroid.y};
	const out = norm({x: b.centroid.x - SYMBOL_C.x, y: b.centroid.y - SYMBOL_C.y});
	const c1 = rotate(out, 25);
	const c2 = rotate(out, 40);
	const C1 = {x: c1.x * SWING, y: c1.y * SWING};
	const C2 = {x: c2.x * 60, y: c2.y * 60};

	const k = prog(t, b.launch, DOCK_DUR);
	const u = k >= 1 ? 1 : E.dock(k);
	// Bézier cúbica: ponto -> canto do quadro -> encaixe (0,0).
	const w0 = (1 - u) ** 3;
	const w1 = 3 * u * (1 - u) ** 2;
	const w2 = 3 * u * u * (1 - u);
	const off = {x: w0 * p0.x + w1 * C1.x + w2 * C2.x, y: w0 * p0.y + w1 * C1.y + w2 * C2.y};
	const rot = b.rot0 * (1 - u);
	const grow = E.dotGrow(prog(t, b.launch + 0.02, 0.3));
	const r = t < b.launch ? DOT_R * E.dotIn(dotT) : lerp(DOT_R, FULL_R, grow);
	return {off, rot, r, done: k >= 1};
};

const Block: React.FC<{b: BlockDef; i: number; t: number}> = ({b, i, t}) => {
	const s = blockState(b, i, t);
	const list = byLayer(b.layer);
	if (s.r <= 0.001) return null;
	if (s.done) return <Raw items={list} />;
	const id = `dot-${b.layer}`;
	return (
		<g transform={`translate(${s.off.x} ${s.off.y}) rotate(${s.rot} ${b.centroid.x} ${b.centroid.y})`}>
			<clipPath id={id} clipPathUnits="userSpaceOnUse">
				<circle cx={b.centroid.x} cy={b.centroid.y} r={s.r} />
			</clipPath>
			<g clipPath={`url(#${id})`}>
				<Raw items={list} />
			</g>
		</g>
	);
};

// Traços de impacto: 2 por bloco (8 no total), 300 ms, só cores do logo.
const ImpactStrokes: React.FC<{t: number}> = ({t}) => (
	<g>
		{BLOCKS.flatMap((b) => {
			const hit = b.launch + DOCK_HIT;
			const k = prog(t, hit, 0.3);
			if (k <= 0 || k >= 1) return [];
			const out = norm({x: b.outer.x - SYMBOL_C.x, y: b.outer.y - SYMBOL_C.y});
			return [-24, 20].map((spread, j) => {
				const d = rotate(out, spread);
				const gap = 22 + j * 6;
				const reach = 92 - j * 16;
				const head = gap + reach * E.strokeHead(k);
				const tail = gap + reach * E.strokeTail(k);
				if (head - tail < 0.5) return null;
				return (
					<line
						key={`${b.layer}-${j}`}
						x1={b.outer.x + d.x * tail}
						y1={b.outer.y + d.y * tail}
						x2={b.outer.x + d.x * head}
						y2={b.outer.y + d.y * head}
						stroke={b.strokeColors[j]}
						strokeWidth={9}
						strokeLinecap="round"
					/>
				);
			});
		})}
	</g>
);

// ------------------------------------------------- ilustrações (wipe por máscara)

type WipeDef = {
	layer: string;
	start: number;
	dur: number;
	ease: (x: number) => number;
	from: {x: number; y: number};
	to: {x: number; y: number};
	feather: number;
	region: [number, number, number, number];
};

// "400 anos", cruz, igreja, padrão indígena — defasagem de 150 ms.
const WIPES: WipeDef[] = [
	{layer: 'ill400', start: 1.4, dur: 0.5, ease: E.wipe400, from: {x: 300, y: 0}, to: {x: 640, y: 0}, feather: 60, region: [120, 120, 680, 480]},
	{layer: 'illAnos', start: 1.4, dur: 0.5, ease: E.wipe400, from: {x: 300, y: 0}, to: {x: 640, y: 0}, feather: 60, region: [120, 120, 680, 480]},
	{layer: 'illCross', start: 1.55, dur: 0.47, ease: E.wipeCross, from: {x: 0, y: 130}, to: {x: 0, y: 580}, feather: 50, region: [590, 130, 1020, 590]},
	{layer: 'illChurch', start: 1.7, dur: 0.48, ease: E.wipeChurch, from: {x: 0, y: 820}, to: {x: 0, y: 390}, feather: 50, region: [120, 380, 640, 830]},
	{layer: 'illPattern', start: 1.85, dur: 0.45, ease: E.wipePattern, from: {x: 590, y: 560}, to: {x: 1040, y: 680}, feather: 50, region: [590, 450, 1040, 810]},
];

const Wipe: React.FC<{w: WipeDef; t: number}> = ({w, t}) => {
	const k = prog(t, w.start, w.dur);
	const list = byLayer(w.layer);
	if (k <= 0) return null;
	if (k >= 1) return <Raw items={list} />;
	const dir = norm({x: w.to.x - w.from.x, y: w.to.y - w.from.y});
	const len = Math.hypot(w.to.x - w.from.x, w.to.y - w.from.y);
	const edge = -w.feather + (len + w.feather) * w.ease(k);
	const a = {x: w.from.x + dir.x * edge, y: w.from.y + dir.y * edge};
	const b = {x: a.x + dir.x * w.feather, y: a.y + dir.y * w.feather};
	const id = `wipe-${w.layer}`;
	const [x0, y0, x1, y1] = w.region;
	return (
		<g>
			<linearGradient id={`${id}-g`} gradientUnits="userSpaceOnUse" x1={a.x} y1={a.y} x2={b.x} y2={b.y}>
				<stop offset="0" stopColor="#fff" />
				<stop offset="1" stopColor="#000" />
			</linearGradient>
			<mask id={id} maskUnits="userSpaceOnUse" x={x0} y={y0} width={x1 - x0} height={y1 - y0}>
				<rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={`url(#${id}-g)`} />
			</mask>
			<g mask={`url(#${id})`}>
				<Raw items={list} />
			</g>
		</g>
	);
};

// ------------------------------------------------------------------- texto

type LineDef = {
	layer: string;
	start: number;
	stagger: number;
	dur: number;
	rise: number;
	rot0: number;
	ease: (x: number) => number;
	clip: [number, number]; // faixa vertical da máscara da linha
};

const CLIP_X0 = 1040; // borda direita do símbolo: o texto nasce daqui

const LINES: LineDef[] = [
	{layer: 'line1', start: 3.0, stagger: 0.028, dur: 0.4, rise: 125, rot0: 7, ease: E.line1, clip: [118, 256]},
	{layer: 'line2', start: 3.16, stagger: 0.032, dur: 0.46, rise: 215, rot0: 6, ease: E.line2, clip: [288, 516]},
	{layer: 'line3', start: 3.32, stagger: 0.032, dur: 0.5, rise: 180, rot0: 6, ease: E.line3, clip: [511, 702]},
];

const TextLine: React.FC<{l: LineDef; t: number}> = ({l, t}) => {
	const list = byLayer(l.layer);
	const end = l.start + l.stagger * (list.length - 1) + l.dur;
	if (t >= end) return <Raw items={list} />;
	if (t <= l.start) return null;
	const id = `clip-${l.layer}`;
	return (
		<g>
			<clipPath id={id} clipPathUnits="userSpaceOnUse">
				<rect x={CLIP_X0} y={l.clip[0]} width={2354 - CLIP_X0} height={l.clip[1] - l.clip[0]} />
			</clipPath>
			<g clipPath={`url(#${id})`}>
				{list.map((g, j) => {
					const k = prog(t, l.start + j * l.stagger, l.dur);
					if (k <= 0) return null;
					const [x0, , x1, y1] = g.bbox as unknown as number[];
					const dy = l.rise * (1 - l.ease(k));
					const rot = l.rot0 * (1 - E.rot(k));
					return (
						<g key={g.i} transform={`translate(0 ${dy}) rotate(${rot} ${(x0 + x1) / 2} ${y1})`}>
							<Raw items={[g]} />
						</g>
					);
				})}
			</g>
		</g>
	);
};

const Line4: React.FC<{t: number}> = ({t}) => {
	const list = byLayer('line4');
	const k = prog(t, 3.85, HOLD_START - 3.85);
	if (k <= 0) return null;
	if (k >= 1) return <Raw items={list} />;
	return (
		<g opacity={E.line4Fade(k)} transform={`translate(0 ${22 * (1 - E.line4Move(k))})`}>
			<Raw items={list} />
		</g>
	);
};

// -------------------------------------------------------------- composição

// Símbolo centralizado na tela (levemente ampliado) até 2,30 s; desliza até 3,00 s.
const symbolTransform = (t: number) => {
	const p = 1 - inOutCubic(prog(t, 2.3, 0.7));
	if (p <= 0) return undefined;
	const s = 1 + 0.12 * p;
	const tx = SYMBOL_C.x + p * (LOCKUP_C.x - SYMBOL_C.x);
	const ty = SYMBOL_C.y + p * (LOCKUP_C.y - SYMBOL_C.y);
	return `translate(${tx} ${ty}) scale(${s}) translate(${-SYMBOL_C.x} ${-SYMBOL_C.y})`;
};

const wipe = (layer: string) => WIPES.find((w) => w.layer === layer)!;
const block = (layer: string) => BLOCKS.findIndex((b) => b.layer === layer);

export const Reveal: React.FC<RevealProps> = ({scale, sub}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const t = (frame + sub) / fps;

	// Posição em pixels inteiros: o quadro final é o PDF original nesta escala.
	const ox = Math.round(width / 2 - LOCKUP_C.x * scale);
	const oy = Math.round(height / 2 - LOCKUP_C.y * scale);
	const base = `translate(${ox} ${oy}) scale(${scale})`;

	let content: React.ReactNode;
	if (t >= HOLD_START - 1e-9) {
		content = <Raw items={items} />;
	} else {
		const B = (layer: string) => {
			const i = block(layer);
			return <Block b={BLOCKS[i]} i={i} t={t} />;
		};
		// Mesma ordem de pintura do arquivo original.
		content = (
			<>
				{LINES.map((l) => (
					<TextLine key={l.layer} l={l} t={t} />
				))}
				<g transform={symbolTransform(t)}>
					{B('blockCoral')}
					{B('blockOlive')}
					<Wipe w={wipe('ill400')} t={t} />
					{B('blockMustard')}
					<Wipe w={wipe('illCross')} t={t} />
					<Wipe w={wipe('illAnos')} t={t} />
					<Wipe w={wipe('illChurch')} t={t} />
					{B('blockRust')}
					<Wipe w={wipe('illPattern')} t={t} />
					<ImpactStrokes t={t} />
				</g>
				<Line4 t={t} />
			</>
		);
	}

	return (
		<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0}}>
			<g dangerouslySetInnerHTML={{__html: LOGO.defs}} />
			<g transform={base}>{content}</g>
		</svg>
	);
};
