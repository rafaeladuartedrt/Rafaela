// Renderiza as subamostras (PNG RGBA, sem perdas) usadas no motion blur por acumulação.
// Uso: node scripts/render_frames.mjs <compositionId> <outDir> [quick]
import path from 'node:path';
import fs from 'node:fs';
import {bundle} from '@remotion/bundler';
import {renderFrames, selectComposition} from '@remotion/renderer';

const [compId, outDir, quick] = process.argv.slice(2);
const BROWSER = process.env.BROWSER_EXECUTABLE || '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const SHUTTER = 0.5; // 180°

// Amostras por quadro de acordo com a velocidade do trecho.
export const SAMPLE_PLAN = [
	{from: 0, to: 23, n: 4}, // pontos surgindo
	{from: 24, to: 86, n: 16}, // voo e encaixe dos blocos
	{from: 87, to: 137, n: 4}, // wipes das ilustrações
	{from: 138, to: 181, n: 8}, // deslize do símbolo
	{from: 182, to: 257, n: 8}, // entrada do texto
	{from: 258, to: 359, n: 1}, // logo parado (original)
];

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const fps = 60;
for (const seg of SAMPLE_PLAN) {
	const n = quick ? 1 : seg.n;
	for (let k = 0; k < n; k++) {
		const sub = n === 1 ? 0 : ((k + 0.5) / n - 0.5) * SHUTTER;
		const inputProps = {sub};
		const composition = await selectComposition({serveUrl, id: compId, inputProps, browserExecutable: BROWSER});
		const dir = path.join(outDir, `f${seg.from}-${seg.to}_n${n}_k${k}`);
		fs.mkdirSync(dir, {recursive: true});
		const t0 = Date.now();
		await renderFrames({
			serveUrl,
			composition,
			inputProps: {...composition.props, sub},
			outputDir: dir,
			imageFormat: 'png',
			frameRange: [seg.from, seg.to],
			concurrency: 4,
			browserExecutable: BROWSER,
			imageSequencePattern: 'frame_[frame].[ext]',
			onStart: () => {},
			onFrameUpdate: () => {},
		});
		console.log(`${compId} ${dir} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
	}
}
