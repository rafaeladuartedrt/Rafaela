// Calcula a escala efetiva (px de tela por px nativo) de cada plano em cada quadro.
// Avisa quando a camera pediria mais que MAX_SCALE (a composicao limita o zoom nesse ponto).
// Uso: node scripts/check-scale.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { buildTimeline } from '../src/core/timeline.ts';
import { cameraAt, isVisible } from '../src/core/camera.ts';
import { MAX_SCALE } from '../src/core/config.ts';
import type { Manifest } from '../src/core/types.ts';

const m: Manifest = JSON.parse(readFileSync(new URL('../src/generated/manifest.json', import.meta.url), 'utf8'));
const { shots } = buildTimeline(m);
const formats: [string, number, number][] = [['1080x1920', 1080, 1920], ['1920x1080', 1920, 1080]];
const rows: any[] = [];
let warnings = 0;
for (const [fmt, W, H] of formats) {
  for (const s of shots) {
    if (s.video) continue;
    for (const it of s.items) {
      let max = 0, maxRaw = 0, at = s.start;
      for (let f = s.start; f < s.end; f++) {
        const c = cameraAt(s, f, W, H);
        if (!isVisible(it, c.cx, c.cy, c.z, W, H)) continue; // fora da tela neste quadro
        const e = c.z * it.s, r = c.zRaw * it.s;
        if (e > max) { max = e; at = f; }
        if (r > maxRaw) maxRaw = r;
      }
      const a = m.assets[it.asset];
      const row = { formato: fmt, plano: s.id, recorte: `${it.asset}/${it.crop}`, arquivo: a.present ? 'confirmado' : 'PENDENTE (tamanho estimado)',
        escala_max: +max.toFixed(3), quadro: at, tempo_s: +(at / 30).toFixed(2), pedida_pela_camera: +maxRaw.toFixed(3), limitada: maxRaw > MAX_SCALE + 1e-6 };
      if (max > MAX_SCALE + 1e-6) { warnings++; console.warn(`AVISO [${fmt}] ${s.id} ${row.recorte}: ${max.toFixed(3)} > ${MAX_SCALE}`); }
      if (row.limitada) console.log(`limite aplicado [${fmt}] ${s.id} ${row.recorte}: camera pedia ${maxRaw.toFixed(3)}, exibido ${max.toFixed(3)}`);
      rows.push(row);
    }
  }
}
mkdirSync(new URL('../out/', import.meta.url), { recursive: true });
writeFileSync(new URL('../out/relatorio_escala.json', import.meta.url), JSON.stringify(rows, null, 1));
const md = ['# Relatório de escala efetiva', '', `Limite: ${MAX_SCALE * 100}% da resolução nativa. Avisos acima do limite: ${warnings}.`, '',
  '| Formato | Plano | Recorte | Arquivo | Escala máx. | Em (s) | Pedida pela câmera | Limitada |', '|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.formato} | ${r.plano} | ${r.recorte} | ${r.arquivo} | ${(r.escala_max * 100).toFixed(1)}% | ${r.tempo_s} | ${(r.pedida_pela_camera * 100).toFixed(1)}% | ${r.limitada ? 'sim' : 'não'} |`)].join('\n');
writeFileSync(new URL('../out/relatorio_escala.md', import.meta.url), md + '\n');
console.log(`${rows.length} planos verificados, ${warnings} acima do limite.`);
process.exit(warnings ? 1 : 0);
