// Cenas a partir das fotos originais: o traço a nanquim (tirado da própria foto) se desenha,
// entra a hachura e a foto original surge por manchas de aquarela. Câmera = enquadramento 2D animado.
import * as THREE from 'three';
import { NOISE, ILLUS } from './glsl.js';
import { G } from './globals.js';
import { InkLines, rng } from './lines.js';

const FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tPhoto; uniform sampler2D tLines;
uniform vec2 uRes; uniform float uPx; uniform vec3 uPaper; uniform vec3 uInk;
uniform float uIA;            // aspecto da imagem (w/h)
uniform vec3 uView;           // centro x, centro y (uv da imagem), zoom
uniform float uRot;
uniform float uDraw;          // 0..1 traço se desenhando
uniform float uDrawMode;      // 0 = de cima para baixo, 1 = da esquerda para a direita, 2 = do centro para fora
uniform float uHatch;         // 0..1 hachura tonal
uniform float uReveal;        // 0..1 foto por aquarela
uniform vec2 uRevealC;        // origem da mancha (uv da imagem)
uniform float uLineOut;       // linhas somem sob a foto
uniform float uSeed; uniform float uPaperWhite; uniform float uReal;
#define NF 18
uniform vec2 uJ[NF * 12]; uniform vec4 uFB[NF]; uniform vec3 uFC[NF]; uniform float uWalk;
float capD(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }
${NOISE}
${ILLUS}
vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }
float hatchL(vec2 p, float ang, float sp, float th){
  vec2 d = vec2(cos(ang), sin(ang));
  float v = dot(p, d) / sp + 0.35 * vnoise2(p * 0.018);
  return 1. - smoothstep(th, th + 0.12, abs(fract(v) - 0.5));
}
void main(){
  float sa = uRes.x / uRes.y;
  // uv da tela -> uv da imagem (cobrindo a tela)
  vec2 s = vUv - 0.5;
  float cr = cos(uRot), sr = sin(uRot);
  s = vec2(cr * s.x - sr * s.y * (1. / sa), (sr * s.x * sa + cr * s.y));
  vec2 span = uIA > sa ? vec2(sa / uIA, 1.) : vec2(1., uIA / sa);
  vec2 iuv = uView.xy + vec2(s.x, -s.y) * span / uView.z;
  float inside = step(0., iuv.x) * step(iuv.x, 1.) * step(0., iuv.y) * step(iuv.y, 1.);
  vec2 tuv = vec2(iuv.x, 1. - iuv.y);
  vec3 photo = toLin(texture2D(tPhoto, tuv).rgb);
  float line = 1. - dot(texture2D(tLines, tuv).rgb, vec3(.333));
  float lum = dot(texture2D(tPhoto, tuv).rgb, vec3(.299,.587,.114));
  // progresso do desenho
  float key = uDrawMode < .5 ? iuv.y : (uDrawMode < 1.5 ? iuv.x : length((iuv - uRevealC) * vec2(uIA, 1.)) * 0.8);
  key += (fbm2(iuv * 7. + uSeed) - .5) * .28;
  float drawn = smoothstep(0., 0.04, uDraw * 1.3 - 0.15 - key);
  // traço com leve tremor de tinta
  float ink = smoothstep(0.18, 0.62, line) * drawn;
  ink *= 0.82 + 0.18 * vnoise2(gl_FragCoord.xy * 0.6 / uPx + uSeed);
  // hachura pela luminância da foto (estilo das pranchas LICVRGO)
  vec2 fp = gl_FragCoord.xy / uPx;
  float dark = 1. - lum;
  float h = 0.;
  h = max(h, hatchL(fp, 0.785, 7.5, 0.08) * smoothstep(0.42, 0.55, dark));
  h = max(h, hatchL(fp, 2.36, 7.5, 0.07) * smoothstep(0.62, 0.74, dark));
  h = max(h, hatchL(fp, 0.2, 5.0, 0.08) * smoothstep(0.8, 0.9, dark));
  float hk = smoothstep(0., 0.05, uHatch * 1.3 - 0.15 - key);
  vec3 drawing = mix(uPaper, uInk, clamp(ink + h * hk * 0.55, 0., 1.) * 0.92);
  // revelação da foto por mancha de aquarela
  float f = length((iuv - uRevealC) * vec2(uIA, 1.));
  float n = fbm2(iuv * 2.5 + uSeed * 1.7) * .15;
  float v = uReveal * 1.75 - 0.15 - f - n;
  float m = smoothstep(0., 0.3, v);
  float ring = smoothstep(0., 0.01, v) * (1. - smoothstep(0.01, 0.07, v));
  // a imagem é remontada como ilustração: tons chapados da paleta, nunca a foto em si
  vec3 cs = texture2D(tPhoto, tuv, 2.5).rgb;
  vec3 wc = illus(cs, fbm2(iuv * 22. + uSeed) - .5);
  wc = mix(wc, uPaper, uPaperWhite * smoothstep(0.82, 0.97, lum));
  // no final o traço vira a imagem real
  float rk = smoothstep(0., 0.35, uReal * 1.35 - 0.2 - (fbm2(iuv * 3. + 9.) * .25 + (1. - iuv.y) * .1));
  wc = mix(wc, photo, rk);
  vec3 wash = wc;
  vec3 col = mix(drawing, wash, m);
  // o traço permanece por cima e some aos poucos
  col = mix(col, uInk, ink * m * 0.9 * (1. - 0.4 * uLineOut) * (1. - uReal));
  col = mix(col, uInk, h * hk * m * 0.25 * (1. - uReal));
  col = mix(uPaper, col, inside);
  // pessoas caminhando: silhuetas em nanquim com mancha de cor na roupa
  if (uWalk > 0.01) {
    vec2 p = vUv * vec2(sa, 1.);
    for (int i = 0; i < NF; i++) {
      vec4 fb = uFB[i];
      if (fb.w <= 0.) continue;
      if (abs(vUv.x - fb.x) > fb.z || abs(vUv.y - fb.y) > fb.w) continue;
      float H = fb.w * 0.95;
      vec2 hip = uJ[i*12]*vec2(sa,1.), sh = uJ[i*12+1]*vec2(sa,1.), hd = uJ[i*12+2]*vec2(sa,1.);
      float cloth = capD(p, hip, sh) - H * 0.105;
      float body = min(cloth, length(p - hd) - H * 0.07);
      vec2 base = vec2(hip.x, hip.y - H * 0.5);
      for (int j = 0; j < 2; j++) {
        vec2 kn = uJ[i*12+3+j*2]*vec2(sa,1.), ft = uJ[i*12+4+j*2]*vec2(sa,1.);
        body = min(body, capD(p, hip, kn) - H * 0.06);
        body = min(body, capD(p, kn, ft) - H * 0.045);
        vec2 el = uJ[i*12+7+j*2]*vec2(sa,1.), hn = uJ[i*12+8+j*2]*vec2(sa,1.);
        body = min(body, capD(p, sh, el) - H * 0.04);
        body = min(body, capD(p, el, hn) - H * 0.034);
        base.y = min(base.y, ft.y);
      }
      float aa = 1.0 / uRes.y;
      // sombra leve no chão, projetada em diagonal
      vec2 q = p - base - vec2(H * 0.18, -H * 0.01);
      float shd = 1. - smoothstep(0.6, 1.0, length(q / vec2(H * 0.32, H * 0.05)));
      col = mix(col, col * 0.62, shd * 0.55 * uWalk);
      float sil = 1. - smoothstep(-aa, aa, body);
      float cl = (1. - smoothstep(-aa, aa, cloth + H * 0.02));
      vec3 c = mix(uInk * 0.9, uFC[i], cl * 0.7) * (0.85 + 0.3 * vnoise2(gl_FragCoord.xy * 0.4 + float(i)));
      col = mix(col, c, sil * uWalk);
    }
  }
  gl_FragColor = vec4(col, 1.);
}`;
const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

export const PHOTOS = [
  'themis_frontal', 'themis_cabeca_icamento', 'themis_guindaste', 'themis_icamento_frontal', 'themis_fixacao',
  'themis_icamento_fachada', 'themis_icamento_fachada_quadrada', 'predio_contraplongee', 'predio_vista_alta', 'predio_vista_baixa', 'estudos',
];

export async function buildPhotoStage() {
  const loader = new THREE.TextureLoader();
  const load = (u) => new Promise((res, rej) => loader.load(u, res, undefined, rej));
  const tex = {};
  for (const n of PHOTOS) {
    const [p, l] = await Promise.all([load(`../assets/photos/${n}.jpg`), load(`../assets/photos/${n}_lines.jpg`)]);
    for (const t of [p, l]) { t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; t.generateMipmaps = true; }
    tex[n] = { photo: p, lines: l, ia: p.image.width / p.image.height };
  }
  const u = {
    tPhoto: { value: null }, tLines: { value: null }, uRes: G.uRes, uPx: G.uPx, uPaper: G.uPaper, uInk: G.uInk,
    uIA: { value: 1 }, uView: { value: new THREE.Vector3(0.5, 0.5, 1) }, uRot: { value: 0 },
    uDraw: { value: 1 }, uDrawMode: { value: 0 }, uHatch: { value: 0 }, uReveal: { value: 0 }, uRevealC: { value: new THREE.Vector2(0.5, 0.5) },
    uLineOut: { value: 0 }, uSeed: { value: 0 }, uPaperWhite: { value: 0 }, uReal: { value: 0 },
    uJ: { value: Array.from({ length: 18 * 12 }, () => new THREE.Vector2()) }, uFB: { value: Array.from({ length: 18 }, () => new THREE.Vector4()) },
    uFC: { value: Array.from({ length: 18 }, () => new THREE.Vector3()) }, uWalk: { value: 0 },
  };
  const m = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u, depthTest: false, depthWrite: false });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m));
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const stage = { scene, cam, u, tex };
  buildWalkers(stage);
  return stage;
}

// configura um quadro: name, view [cx, cy, zoom], draw, hatch, reveal, revealC, lineOut, mode, rot, seed
export function setPhoto(stage, o) {
  const t = stage.tex[o.name], u = stage.u;
  u.tPhoto.value = t.photo; u.tLines.value = t.lines; u.uIA.value = t.ia;
  u.uView.value.set(...o.view); u.uRot.value = o.rot || 0;
  u.uDraw.value = o.draw ?? 1; u.uDrawMode.value = o.mode ?? 0; u.uHatch.value = o.hatch ?? 0;
  u.uReveal.value = o.reveal ?? 0; u.uRevealC.value.set(...(o.revealC || [0.5, 0.5]));
  u.uLineOut.value = o.lineOut ?? 0; u.uSeed.value = o.seed ?? 0; u.uPaperWhite.value = o.paperWhite ?? 0; u.uReal.value = o.real ?? 0;
}

// ---------- pessoas em traço que caminham sobre as fotos (como nas referências) ----------
const SEGS_PER = 16, MAXF = 18;
export function buildWalkers(stage) {
  const segs = [];
  for (let i = 0; i < MAXF * SEGS_PER; i++) segs.push({ a: [0, 0, -0.5], b: [0.01, 0, -0.5], w: 1.25, o: 0 });
  const ln = new InkLines(segs, { seed: 4242, span: 0.001 });
  ln.renderOrder = 20; ln.material.depthTest = false;
  stage.scene.add(ln); stage.walkers = ln;
}
// figs: [{x, y, h, dir, speed, ph}] em uv da imagem (y do topo, pé no chão)
const PALETTE = [[0.16, 0.16, 0.17], [0.24, 0.23, 0.22], [0.12, 0.13, 0.15], [0.30, 0.29, 0.28], [0.20, 0.19, 0.19], [0.36, 0.34, 0.32]];
export function setWalkers(stage, figs, view, t, opacity) {
  const u = stage.u;
  const lin = (c) => c.map((v) => Math.pow(v, 2.2));
  const ia = u.uIA.value, sa = u.uRes.value.x / u.uRes.value.y;
  const span = ia > sa ? [sa / ia, 1] : [1, ia / sa];
  const [vx, vy, z] = view;
  const toS = (x, y) => [0.5 + (x - vx) * z / span[0], 0.5 - (y - vy) * z / span[1]];
  u.uWalk.value = figs.length ? opacity : 0;
  for (let i = 0; i < 18; i++) {
    const f = figs[i];
    if (!f) { u.uFB.value[i].set(0, 0, 0, 0); continue; }
    const ph = t * f.speed * 6.0 + f.ph;
    const x = f.x + f.dir * f.speed * f.h * 0.55 * t;
    const [fx, fy] = toS(x, f.y);
    const H = f.h * z / span[1];          // altura em uv da tela
    const X = 1 / sa;
    const P = (dx, dy) => [fx + f.dir * dx * H * X, fy + dy * H];
    const bob = 0.015 * Math.abs(Math.sin(ph));
    const hip = P(0, 0.5 + bob), sh = P(0.02, 0.8 + bob), hd = P(0.035, 0.91 + bob);
    const J = [hip, sh, hd];
    for (const sgn of [1, -1]) {
      const a = Math.sin(ph) * 0.32 * sgn;
      const knee = [hip[0] + f.dir * Math.sin(a) * 0.26 * H * X, hip[1] - Math.cos(a) * 0.26 * H];
      const b = a - Math.max(0, -Math.sin(ph + 0.6) * sgn) * 0.6;
      const foot = [knee[0] + f.dir * Math.sin(b) * 0.25 * H * X, knee[1] - Math.cos(b) * 0.25 * H];
      J.push(knee, foot);
    }
    for (const sgn of [1, -1]) {
      const a = -Math.sin(ph) * 0.22 * sgn;
      const elb = [sh[0] + f.dir * Math.sin(a) * 0.16 * H * X, sh[1] - Math.cos(a) * 0.16 * H];
      const hand = [elb[0] + f.dir * Math.sin(a + 0.3) * 0.15 * H * X, elb[1] - Math.cos(a + 0.3) * 0.15 * H];
      J.push(elb, hand);
    }
    J.push(hd);
    J.forEach((j, k) => u.uJ.value[i * 12 + k].set(j[0], j[1]));
    u.uFB.value[i].set(fx, fy + H * 0.5, H * 0.6 * X, H * 0.6);
    u.uFC.value[i].set(...lin(PALETTE[(f.c ?? i) % PALETTE.length]));
  }
  if (stage.walkers) stage.walkers.visible = false;
}
export function makeCrowd(seed, n, x0, x1, y0, y1, h0, h1) {
  const r = rng(seed); const out = [];
  while (out.length < n) {
    const y = y0 + (y1 - y0) * r(), x = x0 + (x1 - x0) * r(), dir = r() < 0.5 ? 1 : -1, sp = 0.8 + r() * 0.3;
    const g = 1 + Math.floor(r() * 3);   // grupos de 1 a 3 pessoas
    for (let k = 0; k < g && out.length < n; k++) {
      const h = (h0 + (h1 - h0) * (y - y0) / ((y1 - y0) || 1)) * (0.92 + 0.14 * r());
      out.push({ x: x + k * h * 0.28 * (r() < 0.5 ? 1 : -1), y: y + (r() - 0.5) * h * 0.15, h, dir, speed: sp * (0.95 + 0.1 * r()), ph: r() * 6.28, c: Math.floor(r() * 6) });
    }
  }
  return out.sort((a, b) => a.y - b.y);
}
