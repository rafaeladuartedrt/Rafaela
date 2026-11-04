// Roteiro em função pura do tempo: cada plano configura cena, câmera, luz e pós.
import * as THREE from 'three';
import { G } from './globals.js';
import { REVEAL } from './materials.js';
import { InkLines } from './lines.js';
import { B } from './building.js';
import { setBlades } from './themis.js';
import { setPhoto, setWalkers, makeCrowd } from './photoshots.js';

export const FPS = 30, DURATION = 60;

// ---------- utilitários ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const L3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const eIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eO = (t) => 1 - Math.pow(1 - t, 3);
const eI = (t) => t * t * t;
const eExpIO = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2);
const eSin = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const V = (a) => new THREE.Vector3(...a);

function look(c, pos, tgt, fov = 40, roll = 0) {
  c.cam.position.set(...pos); c.cam.up.set(Math.sin(roll), Math.cos(roll), 0);
  c.cam.fov = fov; c.cam.lookAt(...tgt); c.cam.userData.tgt = V(tgt); c.cam.updateProjectionMatrix(); c.cam.updateMatrixWorld();
}
function setSun(c, dir, color = 0xffffff, I = 2.0, hemiI = 0.75, target = [0, 14, 0]) {
  const d = V(dir).normalize();
  c.sun.position.copy(V(target).add(d.multiplyScalar(160))); c.sun.target.position.set(...target); c.sun.target.updateMatrixWorld();
  c.sun.color.set(color); c.sun.intensity = I; c.hemi.intensity = hemiI;
  for (const k in REVEAL) REVEAL[k].uShadeRef.value = I + hemiI * 0.9;
}
function eachLine(obj, fn) { obj.traverse((o) => { if (o instanceof InkLines) fn(o); }); }
function revealAll(v) { for (const k in REVEAL) REVEAL[k].uReveal.value = v; }
function rv(kind, v, origin, radius, extra = {}) {
  const R = REVEAL[kind]; if (!R) return;
  R.uReveal.value = v; if (origin) R.uOrigin.value.set(...origin); if (radius) R.uRadius.value = radius;
  R.uMode.value = extra.mode ?? 0; if (extra.dir) R.uDir.value.set(...extra.dir);
  R.uNAmp.value = extra.amp ?? 0.5; R.uNFreq.value = extra.freq ?? 0.12; R.uStretch.value = extra.stretch ?? 1;
}
const KINDS_BUILDING = ['granite', 'travertine', 'glass', 'blackgranite', 'mullion', 'alu', 'relief', 'concrete', 'redgranite', 'pave', 'asphalt'];

// ---------- configuração base (todo plano parte daqui) ----------
let extras = null;
function ensureExtras(c) {
  if (extras) return extras;
  // primeira linha do filme: aresta inferior do bloco, fachada leste
  const first = new InkLines([{ a: [27, 8, 11.05], b: [-27, 8, 11.05], w: 2.6, o: 0, o1: 1 }], { overshoot: 0, wobble: 0.04, subdiv: 0.5, seed: 1, span: 0.002 });
  c.bld.root.add(first);
  // cabos do içamento
  const cables = new InkLines([{ a: [-0.9, 7.2, 1.0], b: [-0.5, 40, 1.4], w: 1.3 }, { a: [0.9, 7.2, 1.0], b: [0.5, 40, 1.4], w: 1.3 }], { subdiv: 2, seed: 3 });
  c.themis.add(cables);
  extras = { first, cables };
  return extras;
}
function pieceList(c) { const p = c.bld.pieces; return [p.terrain, ...p.columns, p.ground, ...p.floors, p.loggia, p.roof, p.annex]; }

function reset(c) {
  const ex = ensureExtras(c);
  for (const o of [c.bld.root, c.context, c.people, c.themis, c.studies, c.section, c.hall, c.sheet]) o.visible = false;
  G.uHatch.value = 0; G.uInk.value.set(0x141210); G.uHatchScale.value = 1;
  for (const k in REVEAL) { const R = REVEAL[k]; R.uReveal.value = 0; R.uPatina.value = 1; R.uMode.value = 0; R.uHatchOn.value = 1; R.uStretch.value = 1; R.uNAmp.value = 0.5; R.uNFreq.value = 0.12; R.uOrigin.value.set(0, 0, 0); R.uRadius.value = 60; R.uDir.value.set(0, -1, 0); }
  const cam = c.cam; cam.clearViewOffset(); cam.near = 0.3; cam.far = 2000; cam.zoom = 1;
  c.scene.environment = c.env.day;
  setSun(c, [0.45, 0.8, -0.55]);
  c.hemi.color.set(0xdfe6ee); c.hemi.groundColor.set(0x7d7b78);
  // prédio inteiro, montado, linhas completas
  for (const p of pieceList(c)) {
    p.visible = true; p.scale.set(1, 1, 1);
    if (p.userData.pivot) p.userData.pivot.position.set(0, 0, 0);
    eachLine(p, (l) => { l.progress = 1; l.opacity = 1; l.width = 1; l.visible = true; l.material.uniforms.uRevealYOn.value = 0; });
    if (p.userData.hull) { const u = p.userData.hull.material.uniforms; u.uRevealDir.value = 0; u.uOpacity.value = 1; }
  }
  ex.first.visible = false; ex.cables.visible = false; ex.first.width = 1;
  eachLine(c.context, (l) => { l.progress = 1; l.opacity = 0.9; l.width = 1.3; });
  c.people.progress = 1; c.people.opacity = 1;
  // Themis na fachada sul (posição conferida nas fotos 01 e 02)
  const th = c.themis; th.position.set(B.L / 2, 14.2, -0.4); th.rotation.set(0, Math.PI / 2, 0); th.scale.set(1, 1, 1);
  const tu = th.userData; tu.hull.material.uniforms.uOpacity.value = 1; tu.hull.material.uniforms.uRevealDir.value = 0;
  tu.creases.progress = 1; tu.creases.opacity = 1; tu.swordLines.opacity = 1; tu.swordHull.material.uniforms.uOpacity.value = 1;
  tu.hull.visible = tu.creases.visible = tu.swordHull.visible = tu.swordLines.visible = true;
  setBlades(th, 1); for (const b of tu.blades) b.lines.opacity = 1;
  c.sheet.position.set(0, 0, 0); c.sheet.rotation.set(0, 0, 0);
}

function setLinesOpacity(c, op) {
  for (const p of pieceList(c)) {
    eachLine(p, (l) => { l.opacity = op; });
    if (p.userData.hull) p.userData.hull.material.uniforms.uOpacity.value = op;
  }
  for (const col of c.bld.pieces.columns) col.userData.hull.material.uniforms.uOpacity.value = op;
}
function themisLines(c, op) {
  const tu = c.themis.userData;
  tu.hull.material.uniforms.uOpacity.value = op; tu.creases.opacity = op; tu.swordLines.opacity = op;
  tu.swordHull.material.uniforms.uOpacity.value = op;
  for (const b of tu.blades) b.lines.opacity = op;
}

// zoom 2D sobre um desenho de câmera fixa (como passear sobre a prancha)
function sheetView(c, Z, cx, cy) {
  const W = c.W, H = c.H, w = W / Z, h = H / Z;
  c.cam.setViewOffset(W, H, cx * W - w / 2, (1 - cy) * H - h / 2, w, h);
  c.cam.updateProjectionMatrix();
  const asp = W / H, k = 1.6;
  return [k * (cx * asp - 0.5 * asp / Z), k * (cy - 0.5 / Z), k / Z, k / Z];
}
function project(c, p) { const v = V(p).project(c.cam); return [(v.x + 1) / 2, (v.y + 1) / 2]; }

// =====================================================================
// ATO 1 — O TRAÇO
// =====================================================================
const DRAW_CAM = { pos: [57, 1.2, 41], tgt: [-3, 17.5, -3], fov: 42 };
function drawCenter(t, c) {
  // centro e zoom do "olhar" sobre a prancha
  if (!c._p0) { look(c, DRAW_CAM.pos, DRAW_CAM.tgt, DRAW_CAM.fov); c._p0 = project(c, [27, 8, 11.05]); c._p1 = project(c, [14, 8, 11.05]); }
  const p0 = c._p0, p1 = c._p1;
  let Z, cx, cy;
  if (t < 3) {
    const k = eSin(seg(t, 0, 3));
    Z = lerp(11, 8, k); const head = seg(t, 0.8, 3.0) * 0.9;
    cx = lerp(p0[0], p1[0], 0.15 + head * 0.55) + 0.004 * Math.sin(t * 1.3); cy = lerp(p0[1], p1[1], 0.15 + head * 0.55) + 0.02 + 0.003 * Math.cos(t);
  } else {
    const k = eIO(seg(t, 3, 7.6));
    const z0 = 8;
    Z = Math.exp(lerp(Math.log(z0), Math.log(1.0), k));
    const s0x = lerp(p0[0], p1[0], 0.15 + 0.9 * 0.55), s0y = lerp(p0[1], p1[1], 0.15 + 0.9 * 0.55) + 0.02;
    cx = lerp(s0x, 0.5, k); cy = lerp(s0y, 0.5, k);
    // deriva suave mesmo no fim
    cx += 0.006 * Math.sin(t * 0.9); cy += 0.004 * Math.sin(t * 0.7 + 1);
    Z *= 1 + 0.02 * seg(t, 7.0, 8);
  }
  // whip pan para a direita no fim
  const w = eI(seg(t, 7.72, 8.0));
  cx += w * 1.4;
  return [Z, cx, cy];
}
const shotDrawing = {
  name: 'drawing',
  apply(c, tl, t) {
    reset(c);
    const ex = extras;
    c.bld.root.visible = true; c.context.visible = true; c.people.visible = true;
    look(c, DRAW_CAM.pos, DRAW_CAM.tgt, DRAW_CAM.fov);
    setSun(c, [0.55, 0.75, 0.45]);
    const [Z, cx, cy] = drawCenter(t, c);
    const [Zp, cxp, cyp] = drawCenter(t - 1 / FPS, c);
    look(c, DRAW_CAM.pos, DRAW_CAM.tgt, DRAW_CAM.fov);
    const paper = sheetView(c, Z, cx, cy);
    const wz = Math.max(1, Z * 0.42);
    eachLine(c.bld.root, (l) => { l.width = wz; });
    // primeira linha
    ex.first.visible = true; ex.first.progress = eO(seg(t, 0.7, 3.4));
    ex.first.opacity = 1 - seg(t, 4.2, 4.8);
    // contornos peça a peça, depois grade, hachura, figuras, entorno
    const P = pieceList(c);
    P.forEach((p, i) => {
      const L = p.userData.lines;
      const st = 3.0 + (i / P.length) * 1.8;
      if (L.contour) L.contour.progress = seg(t, st, st + 1.1);
      if (L.grid) L.grid.progress = seg(t, 4.6 + i * 0.04, 6.3 + i * 0.04);
      if (L.brise) L.brise.progress = seg(t, 5.2, 6.6);
      if (L.mural) L.mural.progress = seg(t, 5.6, 6.8);
      if (p.userData.hull) { const u = p.userData.hull.material.uniforms; u.uRevealDir.value = 1; u.uRevealY.value = lerp(-3, 40, seg(t, st, st + 1.1)); }
    });
    for (const col of c.bld.pieces.columns) { const u = col.userData.hull.material.uniforms; u.uRevealDir.value = 1; u.uRevealY.value = lerp(-3, 9, seg(t, 3.2, 4.4)); }
    G.uHatch.value = eO(seg(t, 6.0, 7.4));
    c.people.progress = seg(t, 6.6, 7.7);
    eachLine(c.context, (l) => { l.progress = seg(t, 6.2, 7.9); l.opacity = 0.75; });
    c.themis.visible = false;
    const mb = [(cx - cxp) * c.W * Z, (cy - cyp) * c.H * Z];
    return { paper, mb: Math.hypot(...mb) > 2 ? mb : [0, 0], global: { rake: lerp(0.45, 0.25, seg(t, 1.5, 5)), light: [0.85, 0.4], vig: 0.3 } };
  },
};

const SEC = { fov: 6.6, dist: 330 };
const shotSection = {
  name: 'section',
  apply(c, tl, t) {
    reset(c);
    c.bld.root.visible = false; c.section.visible = true;
    const k = eIO(seg(t, 8.25, 10.95));
    const y = lerp(6.5, 25.5, k);
    look(c, [0.6, y, SEC.dist], [0.6, y, 0], SEC.fov);
    c.cam.near = 100; c.cam.far = 600;
    // whip de entrada vindo da esquerda
    const pin = (tt) => -1.2 * (1 - eO(seg(tt, 8.0, 8.32)));
    const cx = 0.5 + pin(t) + 0.01 * Math.sin(t * 1.1), cxp = 0.5 + pin(t - 1 / FPS) + 0.01 * Math.sin((t - 1 / FPS) * 1.1);
    const Z = 1.0 + 0.04 * Math.sin(t);
    const paper = sheetView(c, Z, cx, 0.5);
    const L = c.section.userData.lines;
    L.ground.progress = seg(t, 8.05, 8.6);
    L.structure.progress = seg(t, 8.15, 9.6);
    L.slabs.progress = seg(t, 8.3, 10.6);
    L.stair.progress = seg(t, 8.45, 10.9);
    L.interior.progress = seg(t, 8.6, 10.9);
    L.roof.progress = seg(t, 10.3, 10.95);
    const mb = [(cx - cxp) * c.W * Z, 0];
    return { paper, mb: Math.abs(mb[0]) > 2 ? mb : [0, 0], near: 100, far: 600, global: { rake: 0.35, vig: 0.3 } };
  },
};

const shotHall = {
  name: 'hall',
  apply(c, tl, t) {
    reset(c);
    c.bld.root.visible = false; c.hall.visible = true;
    const k = eSin(seg(t, 10.8, 14.0));
    const pos = L3([2.5, 1.7, 17], [6, 5.0, 6.2], k);
    const tgt = L3([1.5, 3.4, -20], [6, 5.6, -4], eIO(seg(t, 10.8, 14.0)));
    look(c, pos, tgt, 44);
    const L = c.hall.userData.lines;
    L.floor.progress = seg(t, 10.9, 11.9);
    L.cols.progress = seg(t, 11.0, 12.5);
    L.cols.material.uniforms.uRevealYOn.value = 1; L.cols.material.uniforms.uRevealY.value = lerp(0, 8.7, eO(seg(t, 11.0, 12.4)));
    for (const m of c.hall.userData.colMeshes) if (m.material.uniforms) { m.material.uniforms.uRevealDir.value = 1; m.material.uniforms.uRevealY.value = lerp(0, 8.7, eO(seg(t, 11.0, 12.4))); }
    L.wall.progress = seg(t, 11.5, 13.0);
    L.mezz.progress = seg(t, 11.8, 12.9);
    L.mural.progress = seg(t, 12.2, 13.6);
    L.people.progress = seg(t, 12.8, 13.7);
    G.uHatch.value = 0;
    return { paper: [t * 0.01, 0, 1.6, 1.6], global: { rake: 0.3, vig: 0.3 } };
  },
};

// =====================================================================
// ATO 2 — A CONSTRUÇÃO
// =====================================================================
const MATCH_COL = 9; // pilar (15, +9.3)
function orbitPose(t) {
  // 14.0–22.0: recua do pilar, sobe e orbita parcialmente até um contra-plongée
  const col = [15, B.ground(15), 9.3];
  const p0 = [col[0], col[1] + 5.0, col[2] + 8.6], t0 = [col[0], col[1] + 5.6, col[2]];
  if (t < 16.0) {
    const k = eIO(seg(t, 14.15, 16.0));
    const p1 = [58, 24, 66], t1 = [4, 9, 0];
    return { pos: L3(p0, p1, k), tgt: L3(t0, t1, k), fov: lerp(44, 40, k) };
  }
  const k = seg(t, 16.0, 22.0);
  const a = lerp(Math.atan2(66, 58), -0.75, eSin(k));
  const r = lerp(Math.hypot(58, 66), 62, eSin(k));
  const h = lerp(24, 1.6, eIO(seg(t, 18.5, 22.0)));
  const ty = lerp(9, 19, eIO(seg(t, 18.5, 22.0)));
  return { pos: [Math.cos(a) * r, h, Math.sin(a) * r], tgt: [2, ty, 0], fov: lerp(40, 46, seg(t, 19, 22)) };
}
const shotBuild = {
  name: 'build',
  apply(c, tl, t) {
    reset(c);
    c.bld.root.visible = true; c.sheet.visible = true; c.context.visible = true;
    const P = c.bld.pieces;
    const op = orbitPose(t); look(c, op.pos, op.tgt, op.fov);
    setSun(c, [0.4, 0.85, 0.5]);
    // folha que se deita e vira chão
    const col = P.columns[MATCH_COL];
    c.sheet.position.set(15, B.ground(15) + 0.005, 9.3 - 3.2);
    c.sheet.rotation.x = Math.PI / 2 * eIO(seg(t, 14.3, 15.7));
    const sop = 1 - seg(t, 16.2, 17.2);
    c.sheet.userData.lines.opacity = sop;
    c.sheet.userData.plane.material.transparent = true; c.sheet.userData.plane.material.opacity = sop;
    c.sheet.visible = sop > 0.01;
    // terreno
    P.terrain.visible = t > 15.3; P.terrain.userData.lines.contour.progress = seg(t, 15.3, 16.6);
    // pilotis sobem
    P.columns.forEach((cg, i) => {
      const st = 15.9 + (i === MATCH_COL ? -10 : i * 0.07);
      const k = i === MATCH_COL ? 1 : eO(seg(t, st, st + 0.8));
      cg.scale.y = Math.max(k, 0.001); cg.visible = k > 0.001;
    });
    // térreo
    const gk = eO(seg(t, 16.7, 17.5)); P.ground.scale.y = Math.max(gk, 0.001); P.ground.visible = gk > 0.001;
    P.ground.userData.lines.contour.progress = seg(t, 16.7, 17.6);
    // lajes empilham uma a uma
    const stack = [...P.floors, P.loggia, P.roof];
    stack.forEach((p, i) => {
      const st = 17.3 + i * 0.52;
      const k = seg(t, st, st + 0.6);
      p.visible = t > st - 0.05;
      const drop = 16 * (1 - eO(k)) - 0.35 * Math.sin(Math.PI * seg(t, st + 0.5, st + 0.75));
      p.userData.pivot.position.y = drop;
      const L = p.userData.lines;
      L.contour.progress = seg(t, st - 0.05, st + 0.55);
      if (L.grid) L.grid.progress = seg(t, 19.3 + i * 0.22, 20.9 + i * 0.22);
      if (L.brise) L.brise.progress = seg(t, 20.2 + i * 0.18, 21.6 + i * 0.18);
      if (L.mural) L.mural.progress = seg(t, 20.9, 21.8);
      if (p.userData.hull) { const u = p.userData.hull.material.uniforms; u.uRevealDir.value = 1; u.uRevealY.value = t > st ? 100 : -100; }
    });
    const ak = eO(seg(t, 18.4, 19.2)); P.annex.scale.y = Math.max(ak, 0.001); P.annex.visible = ak > 0.001;
    P.annex.userData.lines.contour.progress = seg(t, 18.4, 19.3);
    eachLine(c.context, (l) => { l.progress = seg(t, 19.2, 21.9); l.opacity = 0.65; });
    G.uHatch.value = 0.55 + 0.45 * seg(t, 19, 21);
    const focus = V(op.pos).distanceTo(V(op.tgt));
    return { paper: [0, 0, 1.6, 1.6], global: { rake: 0.25 }, focus, aperture: t < 14.6 ? 0 : 0 };
  },
};

// detalhes dos materiais (cortes secos)
const DETAILS = [
  { t0: 22.0, t1: 23.3, p0: [34, 17.6, 17.5], p1: [31.2, 19.2, 13.4], g0: [27, 19.3, 8.8], g1: [27, 19.6, 7.4], fov: 34 },
  { t0: 23.3, t1: 24.5, p0: [29.5, -0.6, 14.6], p1: [28.0, -0.2, 12.9], g0: [24, 1.6, 9.3], g1: [24, 1.2, 9.3], fov: 44 },
  { t0: 24.5, t1: 25.7, p0: [9, 16.6, 16.2], p1: [1.5, 17.4, 15.6], g0: [6.5, 16.8, 10.6], g1: [-1, 17.1, 10.6], fov: 38 },
  { t0: 25.7, t1: 26.8, p0: [-1.5, 25.0, 19.5], p1: [0, 28.6, 18.0], g0: [5, 27.2, 8], g1: [5, 28.8, 8], fov: 42 },
  { t0: 26.8, t1: 28.3, p0: [92, 5, 22], p1: [80, 6.5, 15], g0: [27, 18.5, 0], g1: [27, 18.8, 0], fov: 36 },
];
function revealSchedule(t) {
  const eIO = (x) => 0.35 * x + 0.65 * (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  return {
    granite: [eIO(seg(t, 21.8, 25.6)), [27, 19.5, 9], 58],
    travertine: [eIO(seg(t, 23.0, 25.0)), [24, 0, 9.3], 48],
    pave: [eIO(seg(t, 23.0, 26.8)), [24, -1, 9.3], 70, { freq: 0.08 }],
    blackgranite: [eIO(seg(t, 23.4, 25.6)), [20, 2, 8], 40],
    glass: [eIO(seg(t, 24.3, 26.4)), [3, 17, 11], 55],
    mullion: [eIO(seg(t, 24.3, 26.2)), [3, 17, 11], 55],
    alu: [eIO(seg(t, 25.2, 27.0)), [0, 25, -11], 50],
    relief: [eIO(seg(t, 25.7, 26.7)), [5, 25.5, 8], 14],
    concrete: [eIO(seg(t, 25.0, 27.0)), [-30, 2, 8], 30],
    redgranite: [eIO(seg(t, 25.0, 27.0)), [-30, 0, -12], 30],
    asphalt: [eIO(seg(t, 25.4, 27.8)), [30, -2, 20], 160, { freq: 0.05 }],
  };
}
function applyBuildingReveals(t) {
  const s = revealSchedule(t);
  for (const [k, v] of Object.entries(s)) rv(k, v[0], v[1], v[2], v[3] || {});
}
const shotMaterials = {
  name: 'materials',
  apply(c, tl, t) {
    reset(c);
    c.bld.root.visible = true; c.context.visible = true; c.people.visible = true;
    const d = DETAILS.find((q) => t < q.t1) || DETAILS[DETAILS.length - 1];
    const k = eSin(seg(t, d.t0, d.t1));
    look(c, L3(d.p0, d.p1, k), L3(d.g0, d.g1, k), d.fov);
    setSun(c, [0.55, 0.62, -0.55], 0xfff4e6, 2.1);
    applyBuildingReveals(t);
    G.uHatch.value = 1 - seg(t, 26.5, 27.6);
    setLinesOpacity(c, lerp(1, 0.42, seg(t, 23.5, 27.5)));
    eachLine(c.context, (l) => { l.opacity = 0.65; });
    c.people.opacity = lerp(1, 0.6, seg(t, 24, 27));
    return { paper: [0, 0, 1.6, 1.6], sky: [eIO(seg(t, 23.5, 27.5)), 0, 0], global: { rake: 0.15, paperAmt: lerp(1, 0.75, seg(t, 23, 27)) } };
  },
};

// =====================================================================
// ATO 3 — A THEMIS
// =====================================================================
const STUDY_X = [0, 3.5, 7.0, 10.5, 14.0], STUDY_Z = [-1.0, 0.5, -0.7, 0.9, 0], STUDY_S = 0.5;
function studyCam(t) {
  const k = eSin(seg(t, 27.8, 32.4));
  const x = lerp(-0.8, STUDY_X[4], k);
  const ahead = lerp(1.2, 0, seg(t, 31.2, 32.6));
  const y = 2.55 + 0.1 * Math.sin(t * 0.8);
  return { pos: [x, y, 7.6 - 0.25 * Math.sin(Math.PI * k)], tgt: [x + ahead, y - 0.05, 0], fov: 40 };
}
const shotStudies = {
  name: 'studies',
  apply(c, tl, t) {
    reset(c);
    c.studies.visible = true;
    const sc = studyCam(t); look(c, sc.pos, sc.tgt, sc.fov);
    setSun(c, [-0.5, 0.6, 0.8], 0xffffff, 2.0, 0.8, [8, 2.5, 0]);
    G.uInk.value.setRGB(0.16, 0.15, 0.14); G.uHatchScale.value = 1.25; G.uHatch.value = 0.8;
    const items = c.studies.userData.items;
    items.forEach((it, i) => {
      it.grp.position.set(STUDY_X[i], 0.2, STUDY_Z[i] + 0.04);
      let lo = 27.8, hi = 32.4; for (let it2 = 0; it2 < 30; it2++) { const m = (lo + hi) / 2; if (studyCam(m).pos[0] < STUDY_X[i] - 1.2) lo = m; else hi = m; }
      const st = i === 0 ? 27.95 : lo - 0.35;
      const k = seg(t, st, st + 1.3);
      const u = it.hull.material.uniforms; u.uRevealDir.value = -1; u.uRevealY.value = lerp(9.6, -0.5, eO(k)) * STUDY_S + 0.2;
      REVEAL['study' + i] && (REVEAL['study' + i].uHatchOn.value = seg(t, st + 0.6, st + 1.6));
      it.acc.progress = seg(t, st + 0.5, st + 1.4);
      it.gl.progress = seg(t, st - 0.2, st + 0.5);
      eachLine(it.grp, (l) => { if (l !== it.acc && l !== it.gl) l.progress = seg(t, st + 0.7, st + 1.5); });
      it.sheet.position.set(STUDY_X[i], 2.6, STUDY_Z[i]); it.sheet.rotation.z = [0.02, -0.03, 0.015, -0.02, 0][i];
    });
    // foco: segue a folha corrente e faz rack focus para o último estudo
    const camz = sc.pos[2];
    const fNear = camz - STUDY_Z[3], fLast = camz - STUDY_Z[4];
    const focus = lerp(camz - lerp(STUDY_Z[1], STUDY_Z[3], seg(t, 29, 31.4)), fLast, eIO(seg(t, 31.6, 32.5)));
    const aperture = 9 * (1 - seg(t, 32.6, 32.95));
    return { paper: [t * 0.012, 0, 1.6, 1.6], focus: t < 31.6 ? lerp(camz - STUDY_Z[0], fNear, seg(t, 28, 31.4)) : focus, aperture, global: { rake: 0.4 } };
  },
};

const shotThemisLine = {
  name: 'themisLine',
  apply(c, tl, t) {
    reset(c);
    const th = c.themis; th.visible = true;
    th.position.set(0, 0, 0);
    const rot = -0.95 * eSin(seg(t, 33.2, 38.0)) + 0.06 * Math.sin(t * 0.7);
    th.rotation.set(0, rot, 0);
    // casamento com o último estudo (escala 0,5 a 7,6 m => 15,2 m)
    const k = eIO(seg(t, 33.0, 38.0));
    const pos = L3([0, 5.1, 15.2 + 0.95], [1.5, 6.4, 9.0], k);
    const tgt = L3([0, 4.75, 0.95], [0, 5.6, 0.9], k);
    look(c, pos, tgt, 40);
    setSun(c, [-0.6, 0.7, 0.75], 0xfff2e0, 2.4, 0.7, [0, 5, 0]);
    G.uHatch.value = 1 - seg(t, 36.5, 37.5);
    setBlades(th, seg(t, 33.4, 35.8));
    const tu = th.userData;
    tu.creases.progress = seg(t, 33.0, 34.4);
    rv('bronze', seg(t, 35.0, 37.3), [0, 9.6, 1], 10.5, { mode: 1, dir: [0, -1, 0], amp: 0.55, freq: 0.9, stretch: 0.12 });
    REVEAL.bronze.uPatina.value = eIO(seg(t, 36.4, 37.9));
    rv('brass', eIO(seg(t, 36.0, 37.2)), [0, 6.5, 1.6], 5, { mode: 1, dir: [0, -1, 0], amp: 0.3, freq: 1.5, stretch: 0.2 });
    themisLines(c, lerp(1, 0.35, seg(t, 36.8, 38)));
    tu.creases.opacity = lerp(1, 0.25, seg(t, 36.2, 37.6));
    return { paper: [0, 0, 1.6, 1.6], global: { rake: 0.2 } };
  },
};

function finishedBuilding(c, lineOp = 0.35) {
  c.bld.root.visible = true; c.context.visible = true; c.people.visible = true;
  revealAll(1); G.uHatch.value = 0;
  setLinesOpacity(c, lineOp); c.people.opacity = 0.55;
  eachLine(c.context, (l) => { l.opacity = 0.6; });
}
const shotHoist = {
  name: 'hoist',
  apply(c, tl, t) {
    reset(c);
    finishedBuilding(c);
    const th = c.themis; th.visible = true;
    const p = eSin(seg(t, 37.6, 42.7));
    const settle = Math.sin(Math.PI * seg(t, 42.6, 43.3)) * 0.06;
    th.position.set(B.L / 2 + 0.9 * (1 - eO(seg(t, 41.5, 43.0))), 14.2 - 12 * (1 - p) - settle, -0.4);
    th.rotation.set(0.035 * Math.sin(t * 2.1) * (1 - p) + 0.01 * Math.sin(t * 3.3) * (1 - seg(t, 42.6, 43.4)), Math.PI / 2, 0.02 * Math.sin(t * 1.4) * (1 - p));
    extras.cables.visible = true; extras.cables.opacity = 1 - seg(t, 42.8, 43.6);
    themisLines(c, 0.3); th.userData.creases.opacity = 0.15;
    c.scene.environment = c.env.gold;
    setSun(c, [0.35, 0.32, -1.0], 0xfff0de, 2.4, 0.65);
    c.hemi.color.set(0xdde2e8);
    let pos, tgt, fov;
    if (t < 41.2) {
      const k = eSin(seg(t, 38.0, 41.2));
      pos = L3([66, -1.2, -9], [55, -0.6, -6], k); tgt = L3([27, 14, 0], [27, 18.6, -0.5], k); fov = 42;
    } else {
      const k = eSin(seg(t, 41.2, 44.0));
      pos = L3([31.5, 17.1, -17.5], [32.5, 18.8, -13.0], k); tgt = L3([28.0, 18.0, -0.4], [28.2, 18.8, -0.4], k); fov = 40;
    }
    look(c, pos, tgt, fov);
    return { paper: [0, 0, 1.6, 1.6], sky: [1, 0.5, 0], focus: V(pos).distanceTo(V(tgt)), aperture: t > 41.2 ? 2.5 : 0, global: { rake: 0.1, paperAmt: 0.7, warm: 0.1 } };
  },
};

// =====================================================================
// ATO 4 — 360 E FINAL
// =====================================================================
function orbit360(t) {
  const k = seg(t, 44.0, 54.0);
  const kk = 0.5 * k + 0.5 * eIO(k);   // quase constante, sem arrancos
  const a = 0.28 - 2 * Math.PI + 2 * Math.PI * kk + 0.0; // termina diante da fachada sul
  const r = 74 + 24 * Math.sin(kk * Math.PI * 2 * 1.5 + 0.6) - 4 * seg(t, 52, 54);
  const h = 16 + 12 * Math.sin(kk * Math.PI * 2 * 1.0 + 1.9) - 7 * Math.sin(kk * Math.PI * 4) + 4 * seg(t, 52, 54);
  const ty = 15 + 4 * Math.sin(kk * Math.PI * 3);
  const end = seg(t, 52.0, 54.0);
  const tgt = L3([2, ty, 0], [27.6, 19.0, -0.4], eIO(end));
  return { pos: [Math.cos(a) * r, Math.max(h, 2.5), Math.sin(a) * r], tgt, fov: lerp(42, 34, eIO(end)) };
}
const shotOrbit = {
  name: 'orbit',
  apply(c, tl, t) {
    reset(c);
    finishedBuilding(c);
    c.themis.visible = true; themisLines(c, 0.25); c.themis.userData.creases.opacity = 0.1;
    c.scene.environment = c.env.gold;
    setSun(c, [0.4, 0.24, -1.0], 0xffeedb, 2.5, 0.65);
    c.hemi.color.set(0xdde2e8);
    const o = orbit360(t); look(c, o.pos, o.tgt, o.fov);
    return { paper: [0, 0, 1.6, 1.6], sky: [1, 0.75, 0], global: { rake: 0.08, paperAmt: 0.65, warm: 0.12 } };
  },
};
const shotFinale = {
  name: 'finale',
  apply(c, tl, t) {
    reset(c);
    finishedBuilding(c);
    c.themis.visible = true; themisLines(c, 0.25); c.themis.userData.creases.opacity = 0.1;
    c.scene.environment = c.env.gold;
    setSun(c, [0.42, 0.2, -1.0], 0xffe6c8, 2.7, 0.6, [27, 18, 0]);
    c.hemi.color.set(0xdde2e8);
    const o0 = orbit360(54.0);
    const k = eIO(seg(t, 54.0, 59.6));
    const pos = L3(o0.pos, [35.2, 19.5, -2.6], k);
    const tgt = L3(o0.tgt, [28.1, 20.95, -0.25], eIO(seg(t, 54.0, 59.0)));
    const fov = lerp(o0.fov, 30, k);
    pos[0] += 0.15 * Math.sin(t * 0.9); pos[1] += 0.1 * Math.sin(t * 0.7);
    look(c, pos, tgt, fov);
    // últimos 15 quadros: volta ao traço e dissolve no papel
    const back = seg(t, 59.5, 59.8);
    if (back > 0) {
      revealAll(1 - eIO(back)); G.uHatch.value = 0.6 * back;
      themisLines(c, lerp(0.25, 1, back)); c.themis.userData.creases.opacity = lerp(0.1, 0.9, back);
      setLinesOpacity(c, lerp(0.35, 1, back));
    }
    const focus = V(pos).distanceTo(V(tgt));
    return { paper: [0, 0, 1.6, 1.6], sky: [1 - back, 0.8, 0], focus, aperture: lerp(1, 7, seg(t, 55, 58)) * (1 - back), global: { rake: 0.1 + 0.5 * back, paperAmt: lerp(0.65, 1, back), warm: 0.15 * (1 - back), white: eIO(seg(t, 59.72, 59.99)) } };
  },
};

// ---------- planos de comparação com as fotos (não entram no filme) ----------
const cmp = (name, pos, tgt, fov, extra) => ({
  name, apply(c) {
    reset(c); finishedBuilding(c, 0.25); c.themis.visible = true; themisLines(c, 0.1);
    setSun(c, [0.6, 0.7, 0.5], 0xffffff, 2.2, 0.8);
    look(c, pos, tgt, fov); extra && extra(c);
    return { paper: [0, 0, 1.6, 1.6], sky: [1, 0, 0], global: { paperAmt: 0.5 } };
  },
});
export const PREVIEW = {
  cmp01: cmp('cmp01', [48, -0.5, 30], [0, 18, 0], 58),
  cmp02: cmp('cmp02', [52, -0.8, -26], [8, 19, 0], 60),
  cmp03: cmp('cmp03', [80, 120, 90], [0, 10, 0], 30),
  cmp07: cmp('cmp07', [40, 18.8, -0.4], [27, 18.8, -0.4], 32, (c) => { c.context.visible = false; }),
  cmp05: cmp('cmp05', [33, 18.1, -10.5], [27.6, 18.1, -0.4], 38, (c) => { c.context.visible = false; }),
  cmpTh: { name: 'cmpTh', apply(c) { reset(c); c.themis.visible = true; c.themis.position.set(0, 0, 0); c.themis.rotation.set(0, 0, 0); revealAll(1); themisLines(c, 0.2); look(c, [0, 4.6, 20], [0, 4.6, 0], 32); setSun(c, [-0.5, 0.6, 0.8], 0xffffff, 2.2, 0.8, [0, 5, 0]); return { paper: [0, 0, 1.6, 1.6], global: { paperAmt: 0.4 } }; } },
  cmpHands: { name: 'cmpHands', apply(c) { reset(c); c.themis.visible = true; c.themis.position.set(0, 0, 0); c.themis.rotation.set(0, 0, 0); revealAll(1); themisLines(c, 0.0); look(c, [1.5, 6.6, 6], [-0.2, 6.5, 1.5], 34); setSun(c, [-0.5, 0.6, 0.8], 0xffffff, 2.2, 0.8, [0, 5, 0]); return { paper: [0, 0, 1.6, 1.6], global: { paperAmt: 0.4 } }; } },
  cmpThSide: { name: 'cmpThSide', apply(c) { reset(c); c.themis.visible = true; c.themis.position.set(0, 0, 0); c.themis.rotation.set(0, 0, 0); revealAll(1); themisLines(c, 0.2); look(c, [-14, 4.6, 7], [0, 4.6, 1], 34); setSun(c, [-0.5, 0.6, 0.8], 0xffffff, 2.2, 0.8, [0, 5, 0]); return { paper: [0, 0, 1.6, 1.6], global: { paperAmt: 0.4 } }; } },
};

// =====================================================================
// ATOS 3 E 4 — A THEMIS E O PRÉDIO A PARTIR DAS FOTOS ORIGINAIS
// =====================================================================
// cada plano: foto, intervalo, enquadramento inicial/final [cx, cy, zoom] (uv da imagem, y a partir do topo),
// tempos do traço, da hachura e da revelação, origem da mancha
function photoShot(name, P) {
  return {
    name,
    apply(c, tl, t) {
      let view;
      if (P.path) {
        // passeio de câmera por detalhes: [t, cx, cy, zoom], interpolação suave entre paradas (nunca parada)
        const pts = P.path; let i = 0; while (i < pts.length - 2 && t > pts[i + 1][0]) i++;
        const a = pts[i], b = pts[i + 1]; const kk = seg(t, a[0], b[0]);
        const e = 0.12 * kk + 0.88 * eIO(kk);
        view = [lerp(a[1], b[1], e), lerp(a[2], b[2], e), Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), e))];
      } else { const k = (P.ease || eSin)(seg(t, P.t0, P.t1)); view = L3(P.v0, P.v1, k); }
      {
        // mantém o enquadramento dentro da referência (sem bordas de papel ao aproximar)
        const ia = c.photo.tex[P.photo].ia, sa = c.W / c.H;
        const sp = ia > sa ? [sa / ia, 1] : [1, ia / sa];
        const hx = 0.5 * sp[0] / view[2] + 0.006, hy = 0.5 * sp[1] / view[2] + 0.006;
        view[0] = Math.min(Math.max(view[0], hx), 1 - hx); view[1] = Math.min(Math.max(view[1], hy), 1 - hy);
      }
      view[0] += 0.004 * Math.sin(t * 0.9 + P.seed); view[1] += 0.003 * Math.sin(t * 0.7 + P.seed * 2);
      let reveal = eIO(seg(t, ...P.reveal));
      let draw = eO(seg(t, P.draw[0] - (P.pre ?? 0.35), P.draw[1]));
      if (P.back) { const b = seg(t, ...P.back); reveal *= 1 - eIO(b); }
      setPhoto(c.photo, {
        name: P.photo, view, rot: P.rot || 0, mode: P.mode ?? 0, seed: P.seed,
        draw, hatch: eO(seg(t, ...(P.hatch || P.draw.map((x) => x + 0.4)))),
        reveal, revealC: P.c, paperWhite: P.paperWhite || 0, lineOut: eIO(seg(t, ...(P.lineOut || [P.reveal[1] - 0.3, P.reveal[1] + 0.6]))),
      });
      setWalkers(c.photo, P.crowd || [], view, t - P.t0, P.crowd ? eO(seg(t, P.draw[0], P.draw[1])) * (1 - 0.1 * reveal) : 0);
      const white = P.white ? eIO(seg(t, ...P.white)) : 0;
      return { photo: true, paper: [P.seed * 0.1 + t * 0.004, 0, 1.6, 1.6], global: { rake: lerp(0.35, 0.18, reveal), paperAmt: lerp(1, 0.6, reveal), vig: 0.22, white } };
    },
  };
}
const shotStudiesP = photoShot('studiesP', { photo: 'estudos', t0: 27.8, t1: 33.2, v0: [0.115, 0.5, 1.02], v1: [0.9, 0.5, 1.12], mode: 1, draw: [27.9, 31.8], hatch: [28.4, 32.2], reveal: [31.2, 32.9], c: [0.9, 0.45], lineOut: [32.4, 33.2], seed: 1, pre: 0, paperWhite: 1 });
const shotThemisP = photoShot('themisP', { photo: 'themis_frontal', t0: 32.8, t1: 41.3, path: [[32.8, 0.5, 0.5, 1.0], [35.0, 0.52, 0.17, 2.6], [36.6, 0.49, 0.31, 2.3], [38.2, 0.51, 0.55, 2.0], [39.6, 0.5, 0.86, 2.4], [41.3, 0.5, 0.5, 1.05]], draw: [33.0, 35.6], hatch: [34.2, 36.8], reveal: [36.2, 40.0], c: [0.51, 0.18], lineOut: [39.5, 41], seed: 2 });
const shotCabecaP = photoShot('cabecaP', { photo: 'themis_cabeca_icamento', t0: 41.0, t1: 42.4, path: [[41.0, 0.62, 0.45, 1.7], [42.4, 0.55, 0.5, 1.15]], mode: 2, draw: [41.0, 41.5], reveal: [41.3, 42.2], c: [0.62, 0.45], seed: 3 });
const shotGuindP = photoShot('guindasteP', { photo: 'themis_guindaste', t0: 42.4, t1: 43.6, path: [[42.4, 0.25, 0.75, 2.2], [43.6, 0.72, 0.42, 1.6]], mode: 1, draw: [42.4, 42.9], reveal: [42.7, 43.5], c: [0.78, 0.4], seed: 4 });
const shotIcamP = photoShot('icamentoP', { photo: 'themis_icamento_frontal', t0: 43.6, t1: 44.8, path: [[43.6, 0.5, 0.75, 2.0], [44.8, 0.5, 0.42, 1.3]], mode: 2, draw: [43.6, 44.1], reveal: [43.9, 44.7], c: [0.5, 0.72], seed: 5 });
const shotFachP = photoShot('fachadaP', { photo: 'themis_icamento_fachada', t0: 44.8, t1: 46.6, path: [[44.8, 0.47, 0.5, 2.4], [46.6, 0.5, 0.5, 1.0]], mode: 0, draw: [44.8, 45.4], reveal: [45.1, 46.3], c: [0.48, 0.5], seed: 6 });
const shotFixP = photoShot('fixacaoP', { photo: 'themis_fixacao', t0: 46.6, t1: 48.0, path: [[46.6, 0.6, 0.7, 1.3], [48.0, 0.65, 0.3, 2.3]], mode: 2, draw: [46.6, 47.1], reveal: [46.85, 47.8], c: [0.6, 0.65], seed: 7 });
const shotContraP = photoShot('contraplongeeP', { photo: 'predio_contraplongee', t0: 48.0, t1: 50.4, path: [[48.0, 0.45, 0.86, 2.4], [49.2, 0.7, 0.5, 2.0], [50.4, 0.55, 0.5, 1.0]], mode: 2, draw: [48.0, 48.8], reveal: [48.5, 50.0], c: [0.45, 0.85], seed: 8, crowd: makeCrowd(81, 6, 0.1, 0.9, 0.935, 0.975, 0.085, 0.11) });
const shotAltaP = photoShot('vistaAltaP', { photo: 'predio_vista_alta', t0: 50.4, t1: 52.6, path: [[50.4, 0.7, 0.17, 2.6], [51.5, 0.7, 0.5, 1.9], [52.6, 0.45, 0.55, 1.05]], mode: 2, draw: [50.4, 51.1], reveal: [50.8, 52.2], c: [0.7, 0.2], seed: 9, crowd: [...makeCrowd(91, 5, 0.32, 0.6, 0.82, 0.86, 0.055, 0.06), ...makeCrowd(92, 4, 0.4, 0.8, 0.9, 0.95, 0.07, 0.08)] });
const shotBaixaP = photoShot('vistaBaixaP', { photo: 'predio_vista_baixa', t0: 52.6, t1: 54.8, path: [[52.6, 0.38, 0.85, 2.2], [53.6, 0.45, 0.6, 1.2], [54.8, 0.3, 0.43, 2.0]], mode: 2, draw: [52.6, 53.3], reveal: [53.0, 54.4], c: [0.38, 0.8], seed: 10, crowd: [...makeCrowd(101, 5, 0.12, 0.62, 0.95, 0.985, 0.11, 0.13), ...makeCrowd(102, 3, 0.62, 0.9, 0.93, 0.945, 0.06, 0.065)] });
const shotFinalP = photoShot('finalP', { photo: 'themis_frontal', t0: 54.6, t1: 59.7, path: [[54.6, 0.5, 0.5, 1.0], [56.4, 0.5, 0.86, 2.2], [58.0, 0.5, 0.36, 2.4], [59.9, 0.52, 0.17, 3.0]], mode: 2, draw: [54.6, 54.9], reveal: [54.6, 54.61], c: [0.5, 0.3], lineOut: [0, 0.01], back: [59.45, 59.78], white: [59.72, 59.99], seed: 2 });

// ---------- sequência ----------
const SHOTS = [
  [0.0, 8.0, shotDrawing],
  [8.0, 11.0, shotSection],
  [11.0, 14.0, shotHall],
  [14.0, 22.0, shotBuild],
  [22.0, 28.0, shotMaterials],
  [28.0, 33.0, shotStudiesP],
  [33.0, 41.0, shotThemisP],
  [41.0, 42.4, shotCabecaP],
  [42.4, 43.6, shotGuindP],
  [43.6, 44.8, shotIcamP],
  [44.8, 46.6, shotFachP],
  [46.6, 48.0, shotFixP],
  [48.0, 50.4, shotContraP],
  [50.4, 52.6, shotAltaP],
  [52.6, 54.8, shotBaixaP],
  [54.8, 60.0, shotFinalP],
];
// transições com sobreposição: [início, fim, índice do plano de saída, tipo(1 wipe, 2 dissolve), centro]
const TRANS = [
  [10.82, 11.18, 1, 1, [0.5, 0.62]],
  [27.78, 28.22, 4, 1, [0.52, 0.52]],
  [32.8, 33.2, 5, 1, [0.5, 0.3]],
  [44.6, 45.0, 9, 1, [0.5, 0.45]],
  [54.6, 55.0, 14, 2, [0.5, 0.5]],
];
export function evaluate(t) {
  const force = typeof window !== 'undefined' && window.__forceShot;
  if (force) { const s = PREVIEW[force] || SHOTS.find((q) => q[2].name === force)[2]; return { a: { shot: s, tl: 0, tg: t } }; }
  for (const [a, b, i, type, cc] of TRANS) {
    if (t >= a && t < b) {
      const out = SHOTS[i], inn = SHOTS[i + 1];
      return { a: { shot: out[2], tl: t - out[0], tg: t }, b: { shot: inn[2], tl: t - inn[0], tg: t }, trans: { type, t: (t - a) / (b - a), c: cc } };
    }
  }
  const s = SHOTS.find((q) => t >= q[0] && t < q[1]) || SHOTS[SHOTS.length - 1];
  return { a: { shot: s[2], tl: t - s[0], tg: t } };
}
export const SHOT_TABLE = SHOTS.map(([a, b, s]) => ({ a, b, name: s.name }));
