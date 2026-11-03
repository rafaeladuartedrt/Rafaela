// Render determinístico quadro a quadro: servidor estático local + Chromium headless (WebGL/SwiftShader).
// Uso: node tools/render.mjs --w 540 --h 960 --from 0 --to 1800 --step 1 --out out/frames --workers 3
//      node tools/render.mjs --shot cmp01 --t 0 --out out/preview/cmp01.jpg
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]] : a), []));
const W = +(args.w || 540), H = +(args.h || 960);
const ROOT = path.resolve('.');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.bin': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

async function openPage() {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${port}/src/index.html?w=${W}&h=${H}`);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 300000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error(err);
  return { browser, page };
}
async function grab(page, q = 0.95) {
  const data = await page.evaluate((q) => document.querySelector('canvas').toDataURL('image/jpeg', q), q);
  return Buffer.from(data.split(',')[1], 'base64');
}

if (args.shot) {
  const { browser, page } = await openPage();
  const shots = String(args.shot).split(',');
  for (const s of shots) {
    await page.evaluate((s) => { window.__forceShot = s; }, s);
    const t0 = Date.now();
    await page.evaluate((f) => window.renderFrame(f), Math.round(+(args.t || 0) * 30));
    const out = shots.length > 1 ? path.join(args.out, s + '.jpg') : args.out;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, await grab(page));
    console.log(s, Date.now() - t0, 'ms');
  }
  await browser.close(); server.close(); process.exit(0);
}

const from = +(args.from || 0), to = +(args.to || 1800), step = +(args.step || 1), nw = +(args.workers || 3);
const out = args.out || 'out/frames';
fs.mkdirSync(out, { recursive: true });
const frames = []; for (let f = from; f < to; f += step) frames.push(f);
const todo = args.resume ? frames.filter((f) => !fs.existsSync(path.join(out, `f${String(f).padStart(5, '0')}.jpg`))) : frames;
let next = 0, done = 0; const T0 = Date.now();
async function worker(id) {
  const { browser, page } = await openPage();
  while (next < todo.length) {
    const f = todo[next++];
    await page.evaluate((f) => window.renderFrame(f), f);
    fs.writeFileSync(path.join(out, `f${String(f).padStart(5, '0')}.jpg`), await grab(page, +(args.q || 0.94)));
    done++;
    if (done % 20 === 0 || done === todo.length) { const el = (Date.now() - T0) / 1000; console.log(`${done}/${todo.length}  ${(el / done).toFixed(2)} s/quadro  ETA ${((todo.length - done) * el / done / 60).toFixed(1)} min`); }
  }
  await browser.close();
}
await Promise.all(Array.from({ length: Math.min(nw, todo.length) }, (_, i) => worker(i)));
server.close();
