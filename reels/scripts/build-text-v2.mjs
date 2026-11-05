// Tipografia v2: Atkinson Hyperlegible Next (pesos 200 a 800). Segmento: [texto, peso, tamanho, cor]
// cor: L = claro #D7EDE3, B = azul #280A96, O = laranja #FF8A1F
import opentype from 'opentype.js';
import fs from 'fs';
import {svgPathProperties} from 'svg-path-properties';
const dir = new URL('../node_modules/@fontsource/atkinson-hyperlegible-next/files/', import.meta.url);
const F = {};
for (const w of [200, 300, 400, 500, 600, 700, 800]) {
  const b = fs.readFileSync(new URL(`atkinson-hyperlegible-next-latin-${w}-normal.woff`, dir));
  F[w] = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
export const PHRASES = JSON.parse(fs.readFileSync(new URL('./phrases-v2.json', import.meta.url)));
const r = (n) => Math.round(n * 100) / 100;
const out = {}; const problems = [];
for (const [id, lines] of Object.entries(PHRASES)) {
  out[id] = {lines: lines.map((line) => {
    if (line.fit) { let w0 = 0; for (const [t, w, s] of line.seg) w0 += F[w].getAdvanceWidth(t, s, {kerning: true}); const k = line.fit / w0; line.seg = line.seg.map(([t, w, s, c]) => [t, w, s * k, c]); }
    let width = 0;
    for (const [t, w, s] of line.seg) width += F[w].getAdvanceWidth(t, s, {kerning: true}) + (line.track ?? 0) * [...t].length;
    let x = line.x ?? (line.cx ?? 540) - width / 2;
    const letters = []; let word = -1; let prevSpace = true;
    for (const [t, w, s, c] of line.seg) {
      const font = F[w]; const glyphs = font.stringToGlyphs(t); const chars = [...t]; const sc = s / font.unitsPerEm;
      glyphs.forEach((g, i) => {
        const ch = chars[i];
        if (ch === ' ') prevSpace = true; else { if (prevSpace) word++; prevSpace = false; }
        if (ch !== ' ') {
          const p = g.getPath(x, line.y, s); const d = p.toPathData(2); const bb = p.getBoundingBox();
          let len = 300; try { len = Math.round(new svgPathProperties(d).getTotalLength()); } catch (e) {}
          letters.push({ch, d, x: r(x), y: line.y, size: s, weight: w, color: c ?? 'L', len, word, bb: [r(bb.x1), r(bb.y1), r(bb.x2), r(bb.y2)]});
        }
        x += g.advanceWidth * sc + (line.track ?? 0) + (i < glyphs.length - 1 ? font.getKerningValue(g, glyphs[i + 1]) * sc : 0);
      });
    }
    const bb = letters.reduce((a, l) => [Math.min(a[0], l.bb[0]), Math.min(a[1], l.bb[1]), Math.max(a[2], l.bb[2]), Math.max(a[3], l.bb[3])], [1e9, 1e9, -1e9, -1e9]);
    if (!line.free && (bb[0] < 60 || bb[2] > 940 || bb[1] < 250 || bb[3] > 1500)) problems.push(`${id} "${line.seg.map((s) => s[0]).join('')}" ${bb.map(Math.round)}`);
    return {y: line.y, letters, bb, text: line.seg.map((s) => s[0]).join('')};
  })};
}
fs.writeFileSync(new URL('../src/v2/textData.json', import.meta.url), JSON.stringify(out));
for (const [id, v] of Object.entries(out)) console.log(id.padEnd(8), v.lines.map((l) => `"${l.text}" [${l.bb.map(Math.round)}]`).join('  '));
if (problems.length) console.log('FORA DA ZONA SEGURA:\n' + problems.join('\n')); else console.log('Zona segura OK');
