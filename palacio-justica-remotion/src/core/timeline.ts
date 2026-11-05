// Roteiro: cada plano e um "quadro" (papel) com itens posicionados e uma camera.
// Tempos em quadros (30 fps). Ajuste aqui o ritmo.
import type { CamKey, Item, Manifest, Shot, TextCue } from './types.ts';

const sec = (s: number) => Math.round(s * 30);

export function buildTimeline(m: Manifest) {
  const C = (asset: string, crop: string) => {
    const c = m.assets[asset]?.crops[crop];
    if (!c) throw new Error(`Recorte inexistente: ${asset}/${crop}`);
    return c;
  };
  // item com altura normalizada no quadro
  const itemH = (asset: string, crop: string, x: number, y: number, h: number, extra: Partial<Item> = {}): Item => {
    const c = C(asset, crop);
    return { asset, crop, x, y, s: h / c.h, ...extra };
  };
  const W = (it: Item) => C(it.asset, it.crop).w * it.s;
  const Hh = (it: Item) => C(it.asset, it.crop).h * it.s;
  const center = (it: Item): [number, number] => [it.x + W(it) / 2, it.y + Hh(it) / 2];
  const focus = (it: Item, name: string, fallback: [number, number] = [0.5, 0.5]): [number, number] => {
    const c = C(it.asset, it.crop);
    const p = c.focus[name] ?? [fallback[0] * c.w, fallback[1] * c.h];
    return [it.x + p[0] * it.s, it.y + p[1] * it.s];
  };
  // chave que enquadra o item inteiro com folga "pad", deslocada por (dx, dy) e zoom k (>1 aproxima)
  const fitKey = (f: number, it: Item, k = 1, dx = 0, dy = 0, r = 0, pad = 1.08): CamKey => {
    const [cx, cy] = center(it);
    return { f, cx: cx + dx * W(it), cy: cy + dy * Hh(it), vw: (W(it) * pad) / k, vh: (Hh(it) * pad) / k, r };
  };
  // chave por escala-alvo (px de tela por px nativo), igual nos dois formatos (visao quadrada)
  const scaleKey = (f: number, p: [number, number], target: number, it: Item, r = 0): CamKey => {
    const side = 1080 / (target / it.s);
    return { f, cx: p[0], cy: p[1], vw: side, vh: side, r };
  };
  const pointKey = (f: number, p: [number, number], vw: number, vh: number, r = 0): CamKey => ({ f, cx: p[0], cy: p[1], vw, vh, r });

  const shots: Shot[] = [];
  const HN = 1000; // altura comum das pranchas no quadro do Ato 1

  // ---------- ATO 1 / Cenas 1 e 2: corte longitudinal e cortes, num mesmo papel ----------
  {
    const start = 0, end = sec(12);
    const items: Item[] = [];
    const it1 = itemH('a01_corte_longitudinal', 'inteiro', 0, 0, HN, { reveal: { type: 'stroke-up', from: 0, to: sec(4.0) },
      blocks: [{ name: 'escada', from: sec(3.3), dir: 'up' }] });
    items.push(it1);
    let x = W(it1) + 260;
    const seq: [string, string, boolean][] = [
      ['a02_cortes_aa_bb_cc', 'corte_aa', true], ['a02_cortes_aa_bb_cc', 'corte_bb', false], ['a02_cortes_aa_bb_cc', 'corte_cc', false],
      ['a03_palacio_cortes', 'elevacao_a', true], ['a03_palacio_cortes', 'elevacao_b', true],
      ['a04_corte_aa_esc_ext', 'elevacao_escada', true], ['a04_corte_aa_esc_ext', 'corte_aa', true],
    ];
    // inicio de cada revelacao (s): sequencia rapida; o item 4 (confirmado) fica mais tempo
    const starts = [4.5, 5.2, 5.9, 6.6, 7.3, 8.1, 9.4].map(sec);
    seq.forEach(([a, c, withBlocks], i) => {
      const from = starts[i];
      const it = itemH(a, c, x, 0, HN, { reveal: { type: 'stroke-up', from, to: from + (a === 'a04_corte_aa_esc_ext' ? sec(1.9) : sec(1.3)) } });
      const names = Object.keys(C(a, c).blocks);
      if (withBlocks && names.length) it.blocks = names.map((n, j) => ({ name: n, from: from + sec(1.35) + j * 10, dir: 'up' as const }));
      items.push(it);
      x += W(it) + 140;
    });
    const viewW = 1250, viewH = HN * 1.12;
    const cam: CamKey[] = [
      // cena 1: camera desce do topo ate a base com leve zoom out
      { f: 0, cx: center(it1)[0], cy: HN * 0.22, vw: W(it1) * 0.62, vh: HN * 0.62 },
      { f: sec(4.3), cx: center(it1)[0], cy: HN * 0.55, vw: W(it1) * 1.06, vh: viewH },
    ];
    // cena 2: deslize lateral continuo pelo papel, acompanhando cada revelacao
    items.slice(1).forEach((it, i) => {
      cam.push({ f: starts[i] + sec(0.7), cx: center(it)[0], cy: HN * 0.5, vw: Math.max(viewW, W(it) * 1.06), vh: viewH });
    });
    const last = items[items.length - 1];
    cam.push({ f: end - start, cx: center(last)[0] + W(last) * 0.25, cy: HN * 0.5, vw: Math.max(viewW, W(last) * 1.06), vh: viewH });
    shots.push({ id: 'c1-2_cortes', scene: 'Cenas 1-2: corte longitudinal e cortes', start, end, items, cam, inT: { type: 'none', dur: 0 } });
  }

  // ---------- Cena 3: perspectiva a bico de pena ----------
  {
    const start = sec(11.2), end = sec(15.8);
    const it = itemH('a05_perspectiva_bico_pena', 'inteiro', 0, 0, HN, {
      reveal: { type: 'stroke-right', from: 6, to: sec(2.0) },
      blocks: [{ name: 'brises', from: sec(1.7), dir: 'up' }],
    });
    shots.push({ id: 'c3_perspectiva', scene: 'Cena 3: perspectiva a bico de pena (creditos visiveis)', start, end, items: [it],
      cam: [fitKey(0, it, 0.98, -0.04), fitKey(end - start, it, 1.04, 0.0)], inT: { type: 'dissolve', dur: 22, blur: 4 } });
  }

  // ---------- Cena 4: perspectiva detalhada (6) e vista principal de (7) ----------
  {
    const start = sec(15.0), end = sec(18.8);
    const it = itemH('a06_perspectiva_themis', 'inteiro', 0, 0, HN);
    shots.push({ id: 'c4a_persp_themis', scene: 'Cena 4: perspectiva detalhada', start, end, items: [it],
      cam: [fitKey(0, it, 1.04, 0.02), fitKey(end - start, it, 1.16, 0.05)], inT: { type: 'dissolve', dur: 24, blur: 3 } });
  }
  {
    const start = sec(18.0), end = sec(21.6);
    const it = itemH('a07_perspectivas', 'esquerda', 0, 0, HN);
    shots.push({ id: 'c4b_persp_principal', scene: 'Cena 4: vista principal (1. Perspectivas)', start, end, items: [it],
      cam: [fitKey(0, it, 1.06), fitKey(end - start, it, 1.2, 0.03)], inT: { type: 'dissolve', dur: 24, blur: 3 } });
  }

  // ---------- Cena 5: do desenho a foto (luma matte) -> brises hoje ----------
  {
    const start = sec(20.6), end = sec(25.0);
    const it = itemH('a10_brises_foto', 'inteiro', 0, 0, 2000, { reveal: { type: 'luma-up', from: 0, to: sec(1.7) } });
    shots.push({ id: 'c5_brises', scene: 'Cena 5: foto atual dos brises', start, end, items: [it],
      cam: [fitKey(0, it, 1.35, 0, 0.14), fitKey(end - start, it, 1.42, 0, -0.12)], inT: { type: 'none', dur: sec(1.4), blur: 6 } });
  }

  // ---------- Cena 6: hall ----------
  {
    const start = sec(24.2), end = sec(27.8);
    const it = itemH('a08_hall', 'inteiro', 0, 0, HN, { reveal: { type: 'stroke-right', from: 0, to: sec(1.9) } });
    shots.push({ id: 'c6_hall', scene: 'Cena 6: Vista do Hall (travelling)', start, end, items: [it],
      cam: [fitKey(0, it, 1.0), fitKey(end - start, it, 1.45, 0.02, 0.04)], inT: { type: 'dissolve', dur: 18, blur: 3 } });
  }

  // ---------- Cena 7: fotos da escada -> vista de cima com rotacao ----------
  {
    const start = sec(27.2), end = sec(31.0);
    const panel = C('a09_escadas_fotos', 'painel');
    const it = itemH('a09_escadas_fotos', 'painel', 0, 0, HN);
    const top = C('a09_escadas_fotos', 'vista_de_cima');
    const sc = it.s;
    const fc = top.focus['centro_espiral'] ?? [top.w / 2, top.h / 2];
    const spiral: [number, number] = [(top.x - panel.x + fc[0]) * sc, (top.y - panel.y + fc[1]) * sc];
    shots.push({ id: 'c7_escadas', scene: 'Cena 7: escadas, vista de cima girando', start, end, items: [it],
      cam: [fitKey(0, it, 1.0), pointKey(sec(1.3), spiral, top.w * sc * 1.1, top.h * sc * 1.1, 4),
        scaleKey(end - start, spiral, 1.45, it, 25)],
      inT: { type: 'dissolve', dur: 20, blur: 3 } });
  }

  // ---------- ATO 2 / Cena 8: estudos da Themis surgem do centro da espiral ----------
  const themisFrame = (names: string[], gap: number) => {
    let x = 0;
    return names.map((n) => {
      const c = C('a11_themis_2005', n);
      const it: Item = { asset: 'a11_themis_2005', crop: n, x, y: -c.h / 2, s: 1, frame: true };
      x += c.w + gap;
      return it;
    });
  };
  {
    const start = sec(30.4), end = sec(35.6);
    const items = themisFrame(['estudo_1', 'estudo_2', 'estudo_3'], 70);
    items.forEach((it, i) => (it.reveal = { type: 'stroke-up', from: sec(0.6) + i * sec(1.1), to: sec(1.9) + i * sec(1.1) }));
    const totalW = items[items.length - 1].x + W(items[items.length - 1]);
    const h = Hh(items[0]);
    shots.push({ id: 'c8_estudos', scene: 'Cena 8: desenhos de estudo da Themis', start, end, items,
      cam: [scaleKey(0, [totalW / 2, 0], 1.22, items[0]), scaleKey(end - start, [totalW / 2, 0], 1.38, items[0])],
      inT: { type: 'iris', dur: 26 } });
  }

  // ---------- Cena 9: modelos (confeccao) ----------
  const single = (crop: string, start: number, end: number, scene: string, id: string, k0 = 1.32, k1 = 1.42): Shot => {
    const c = C('a11_themis_2005', crop);
    const it: Item = { asset: 'a11_themis_2005', crop, x: -c.w / 2, y: -c.h / 2, s: 1, frame: true, reveal: { type: 'luma', from: 0, to: sec(1.2) } };
    return { id, scene, start, end, items: [it], cam: [scaleKey(0, [0, 0], k0, it), scaleKey(end - start, [0, 0], k1, it)],
      inT: { type: 'dissolve', dur: 16, blur: 2 } };
  };
  shots.push(single('modelo_escuro', sec(35.0), sec(37.6), 'Cena 9: modelo escuro em pe', 'c9a_modelo_escuro'));
  shots.push(single('modelo_claro', sec(37.0), sec(39.6), 'Cena 9: modelo claro deitado', 'c9b_modelo_claro'));

  // ---------- Cena 10: Themis na fachada (desenho) -> foto da instalacao ----------
  {
    const start = sec(39.0), end = sec(41.6);
    const c = C('a11_themis_2005', 'fachada');
    const it: Item = { asset: 'a11_themis_2005', crop: 'fachada', x: -c.w / 2, y: -c.h / 2, s: 1, frame: true, reveal: { type: 'stroke-up', from: 0, to: sec(1.3) } };
    shots.push({ id: 'c10a_fachada_desenho', scene: 'Cena 10: desenho da Themis na fachada', start, end, items: [it],
      cam: [scaleKey(0, [0, c.h * 0.08], 1.28, it), scaleKey(end - start, [0, -c.h * 0.05], 1.44, it)],
      inT: { type: 'dissolve', dur: 18, blur: 2 } });
  }
  {
    const start = sec(41.0), end = sec(44.6);
    const it = itemH('a12_themis_instalacao', 'inteiro', 0, 0, 2000);
    const base = focus(it, 'base', [0.5, 0.85]), rosto = focus(it, 'rosto', [0.5, 0.2]);
    shots.push({ id: 'c10b_instalacao', scene: 'Cena 10: foto da instalacao, da base ao rosto', start, end, items: [it],
      cam: [pointKey(0, base, W(it) * 0.85, Hh(it) * 0.6), pointKey(end - start, rosto, W(it) * 0.6, Hh(it) * 0.45)],
      inT: { type: 'dissolve', dur: 26, blur: 3 } });
  }

  // ---------- ATO 3 / Cena 11: orbita simulada ----------
  const orbitA = sec(44.0), orbitB = sec(53.4);
  if (m.optional.orbita) {
    shots.push({ id: 'c11_orbita_video', scene: 'Cena 11: orbita (assets/orbita.mp4)', start: orbitA, end: orbitB, items: [], cam: [],
      inT: { type: 'dissolve', dur: 20, blur: 2 }, video: m.optional.orbita });
  } else {
    const order: [string, string][] = [
      ['a07_perspectivas', 'esquerda'], ['a06_perspectiva_themis', 'inteiro'], ['a07_perspectivas', 'direita'],
      ['a05_perspectiva_bico_pena', 'inteiro'], ['a10_brises_foto', 'inteiro'],
    ];
    const len = (orbitB - orbitA) / order.length, ov = 14;
    order.forEach(([a, c], i) => {
      const start = Math.round(orbitA + i * len), end = Math.round(orbitA + (i + 1) * len + ov);
      const it = itemH(a, c, 0, 0, HN);
      const k = a === 'a10_brises_foto' ? 1.25 : 1.12;
      // todos os planos deslizam para a esquerda na tela (camera anda para a direita), mesma velocidade relativa
      shots.push({ id: `c11_orbita_${i + 1}`, scene: `Cena 11: orbita ${i + 1}/${order.length}`, start, end, items: [it],
        cam: [fitKey(0, it, k, -0.09), fitKey(end - start, it, k, 0.09)], camTime: [orbitA, orbitB + ov], parallax: 1.35,
        inT: { type: 'dissolve', dur: ov, blur: 2 } });
    });
  }

  // ---------- ATO 4 / Cena 12: zoom na Themis ----------
  {
    const start = sec(53.0), end = sec(56.0);
    const it = itemH('a06_perspectiva_themis', 'inteiro', 0, 0, HN);
    const th = focus(it, 'themis', [0.78, 0.45]);
    shots.push({ id: 'c12a_zoom_themis', scene: 'Cena 12: zoom na Themis (perspectiva)', start, end, items: [it],
      cam: [fitKey(0, it, 1.12, 0.06), scaleKey(end - start, th, 1.45, it)], inT: { type: 'dissolve', dur: 16, blur: 2 } });
  }
  {
    const start = sec(55.4), end = sec(58.6);
    const it = itemH('a12_themis_instalacao', 'inteiro', 0, 0, 2000);
    const rosto = focus(it, 'rosto', [0.5, 0.2]);
    shots.push({ id: 'c12b_rosto', scene: 'Cena 12: rosto da Themis (foto)', start, end, items: [it],
      cam: [scaleKey(0, rosto, 1.1, it), scaleKey(end - start, rosto, 1.45, it)],
      inT: { type: 'dissolve', dur: 20, blur: 3 }, fadeOut: sec(1.3) });
  }

  for (const sh of shots) for (const it of sh.items) { const c = C(it.asset, it.crop); it.w = c.w; it.h = c.h; }

  const texts: TextCue[] = [
    { text: 'Do traço', from: sec(1.0), to: sec(4.4), size: 76, weight: 300 },
    { text: 'à forma', from: sec(21.6), to: sec(24.4), size: 76, weight: 300 },
    { text: 'Themis', from: sec(31.4), to: sec(34.8), size: 76, weight: 300 },
  ];
  const ending = { from: sec(57.2), title: 'Palácio da Justiça' };
  return { shots, texts, ending };
}
