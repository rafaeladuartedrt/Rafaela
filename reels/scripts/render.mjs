// Uso: node scripts/render.mjs sheet [compId] | video <compId> <saida.mp4> | frames <compId> f1,f2,...
import {bundle} from '@remotion/bundler';
import {selectComposition, renderMedia, renderStill} from '@remotion/renderer';
import path from 'path';
import fs from 'fs';

const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const [mode, compId = 'Reels', arg, scaleArg] = process.argv.slice(2);
const root = path.resolve(new URL('..', import.meta.url).pathname);
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts')});
const composition = await selectComposition({serveUrl, id: compId, browserExecutable});
const outDir = path.join(root, 'out');
fs.mkdirSync(outDir, {recursive: true});

if (mode === 'video') {
  await renderMedia({
    serveUrl, composition, codec: 'h264', outputLocation: arg, browserExecutable, concurrency: 4,
    muted: true, scale: scaleArg ? Number(scaleArg) : 1, crf: 16, pixelFormat: 'yuv420p', x264Preset: 'slow', colorSpace: 'bt709', imageFormat: 'png',
    onProgress: ({progress}) => { if (Math.round(progress * 100) % 10 === 0) process.stdout.write(`\r${Math.round(progress * 100)}%`); },
  });
  console.log('\nok', arg);
} else {
  const frames = mode === 'frames' ? arg.split(',').map(Number) : Array.from({length: 60}, (_, i) => i * 15);
  const dir = path.join(outDir, 'sheet');
  fs.mkdirSync(dir, {recursive: true});
  for (const frame of frames) {
    await renderStill({serveUrl, composition, frame, output: path.join(dir, `f${String(frame).padStart(3, '0')}.png`), browserExecutable, scale: 0.5});
  }
  console.log('ok', frames.length);
}
