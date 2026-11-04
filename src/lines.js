// Traço de nanquim: segmentos instanciados em quads de tela, com espessura variável,
// pontas afinadas, sobretraço nos cantos, tremor de mão e revelação progressiva (build).
import * as THREE from 'three';
import { G } from './globals.js';

// gerador pseudo-aleatório determinístico
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const VERT = /* glsl */`
uniform vec2 uRes; uniform float uProgress; uniform float uSpan; uniform float uPx; uniform float uWidth;
uniform float uRevealY; uniform float uRevealYOn;
attribute vec3 iA; attribute vec3 iB; attribute float iW; attribute float iO; attribute float iR;
varying float vSide; varying float vVis; varying float vR; varying float vAlong; varying float vFade;
void main(){
  float r = clamp((uProgress * (1. + uSpan) - iO) / uSpan, 0., 1.);
  vec4 ca = projectionMatrix * modelViewMatrix * vec4(iA, 1.);
  vec4 cb = projectionMatrix * modelViewMatrix * vec4(iB, 1.);
  // recorte no plano próximo
  float e = 0.05;
  if (ca.w < e && cb.w < e) { gl_Position = vec4(2.,2.,2.,1.); vVis = 0.; return; }
  if (ca.w < e) ca = mix(ca, cb, (e - ca.w) / (cb.w - ca.w));
  if (cb.w < e) cb = mix(cb, ca, (e - cb.w) / (ca.w - cb.w));
  vec3 wa = (modelMatrix * vec4(iA,1.)).xyz; vec3 wb = (modelMatrix * vec4(iB,1.)).xyz;
  float t = position.x * r;
  vec4 c = mix(ca, cb, t);
  float wy = mix(wa.y, wb.y, t);
  vec2 sa = ca.xy / ca.w, sb = cb.xy / cb.w;
  vec2 d = (sb - sa) * uRes; float L = length(d);
  vec2 dir = L > 1e-4 ? d / L : vec2(1., 0.);
  vec2 nrm = vec2(-dir.y, dir.x);
  float taper = 1.0;
  float w = max(iW * uPx * uWidth * taper, 1.3);
  vFade = smoothstep(3., 14., L);   // segmentos minúsculos na tela somem em vez de cintilar
  vec2 off = nrm * position.y * w + dir * (position.x * 2. - 1.) * w * 0.5;
  c.xy += off / uRes * 2. * c.w * 0.5;
  gl_Position = c;
  vSide = position.y; vR = iR; vAlong = position.x;
  vVis = (r > 0.) ? 1. : 0.;
  if (uRevealYOn > 0.5 && wy > uRevealY) vVis = 0.;
}`;

const FRAG = /* glsl */`
uniform vec3 uColor; uniform float uOpacity;
varying float vSide; varying float vVis; varying float vR; varying float vAlong; varying float vFade;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  if (vVis < 0.5) discard;
  // pincelada contínua: borda levemente ondulada e estável (não muda de quadro para quadro)
  float wob = 0.06 * sin(vAlong * 9. + vR * 40.);
  float edge = 1. - smoothstep(0.62 + wob, 0.98, abs(vSide));
  float a = uOpacity * edge * vFade * (0.82 + 0.18 * vR);
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}`;

const QUAD = new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, -1, 0, 1, 1, 0, 0, 1, 0]);

// segs: [{a:[x,y,z], b:[x,y,z], w, o}] ; opts: overshoot, wobble, subdiv, seed
export class InkLines extends THREE.Mesh {
  constructor(segs, opts = {}) {
    const R = rng(opts.seed || 7);
    const over = opts.overshoot ?? 0.0, wob = opts.wobble ?? 0.0, maxLen = opts.subdiv ?? 1e9;
    const A = [], B = [], W = [], O = [], RR = [];
    const sketch = opts.sketch ?? true;
    const segs2 = [];
    for (const s of segs) {
      segs2.push(s);
      if (sketch) {
        const j = () => (R() - 0.5) * (opts.jitter ?? 0.12);
        segs2.push({ ...s, a: [s.a[0] + j(), s.a[1] + j(), s.a[2] + j()], b: [s.b[0] + j(), s.b[1] + j(), s.b[2] + j()], w: (s.w ?? 1) * 0.55 });
      }
    }
    for (const s of segs2) {
      let a = s.a.slice(), b = s.b.slice();
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      const len = Math.hypot(dx, dy, dz); if (len < 1e-6) continue;
      const ux = dx / len, uy = dy / len, uz = dz / len;
      if (over > 0) {
        const o1 = over * (0.2 + R()) * Math.min(1, len / 2), o2 = over * (0.2 + R()) * Math.min(1, len / 2);
        a = [a[0] - ux * o1, a[1] - uy * o1, a[2] - uz * o1]; b = [b[0] + ux * o2, b[1] + uy * o2, b[2] + uz * o2];
      }
      const n = Math.max(1, Math.ceil(len / maxLen));
      // vetor perpendicular para o tremor
      let px = -uz, py = 0, pz = ux; if (Math.abs(uy) > 0.9) { px = 1; py = 0; pz = 0; }
      const ph = R() * 6.28, fr = 1 + R() * 2;
      let prev = a;
      const o0 = s.o ?? 0, o1 = s.o1 ?? o0;
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const wv = i === n ? 0 : wob * Math.sin(ph + t * fr * 6.28) * Math.min(1, len / 4);
        const p = [a[0] + (b[0] - a[0]) * t + px * wv, a[1] + (b[1] - a[1]) * t + py * wv, a[2] + (b[2] - a[2]) * t + pz * wv];
        A.push(...prev); B.push(...p); W.push((s.w ?? 1) * (0.8 + 0.4 * R()));
        O.push(o0 + (o1 - o0) * ((i - 1) / n)); RR.push(R());
        prev = p;
      }
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(QUAD, 3));
    g.setAttribute('iA', new THREE.InstancedBufferAttribute(new Float32Array(A), 3));
    g.setAttribute('iB', new THREE.InstancedBufferAttribute(new Float32Array(B), 3));
    g.setAttribute('iW', new THREE.InstancedBufferAttribute(new Float32Array(W), 1));
    g.setAttribute('iO', new THREE.InstancedBufferAttribute(new Float32Array(O), 1));
    g.setAttribute('iR', new THREE.InstancedBufferAttribute(new Float32Array(RR), 1));
    g.instanceCount = W.length;
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const m = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      uniforms: {
        uRes: G.uRes, uPx: G.uPx,
        uProgress: { value: 1 }, uSpan: { value: opts.span ?? 0.04 }, uWidth: { value: opts.width ?? 1 },
        uColor: { value: new THREE.Color(opts.color ?? 0x141210) }, uOpacity: { value: 1 },
        uRevealY: { value: 1e5 }, uRevealYOn: { value: 0 },
      },
    });
    super(g, m);
    this.frustumCulled = false;
    this.renderOrder = 10;
    this.count = W.length;
  }
  set progress(v) { this.material.uniforms.uProgress.value = v; this.visible = this.visible && true; }
  get progress() { return this.material.uniforms.uProgress.value; }
  set opacity(v) { this.material.uniforms.uOpacity.value = v; }
  set width(v) { this.material.uniforms.uWidth.value = v; }
}

// ---- auxiliares para montar listas de segmentos ----
export function boxEdges(x0, y0, z0, x1, y1, z1, w = 1) {
  const P = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
  const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  return E.map(([i, j]) => ({ a: P[i], b: P[j], w }));
}
export function ring(cx, y, cz, r, n = 28, w = 1, axis = 'y') {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
    if (axis === 'y') out.push({ a: [cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r], b: [cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r], w });
  }
  return out;
}
export function polyline(pts, w = 1, closed = false) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) out.push({ a: pts[i], b: pts[i + 1], w });
  if (closed) out.push({ a: pts[pts.length - 1], b: pts[0], w });
  return out;
}
// atribui ordem de desenho: por chave (ex.: altura, distância) normalizada
export function orderBy(segs, key) {
  const ks = segs.map(key); const mn = Math.min(...ks), mx = Math.max(...ks);
  segs.forEach((s, i) => { s.o = (ks[i] - mn) / ((mx - mn) || 1); });
  return segs;
}
export function orderSeq(segs) { segs.forEach((s, i) => { s.o = i / Math.max(1, segs.length - 1); }); return segs; }

// Contorno por casca invertida (silhueta em espessura constante de tela)
const HULL_V = /* glsl */`
uniform vec2 uRes; uniform float uPx; uniform float uWidth;
varying vec3 vW;
void main(){
  vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  vec3 nv = normalize(normalMatrix * normal);
  vec2 nd = (projectionMatrix * vec4(nv, 0.)).xy;
  float l = length(nd); nd = l > 1e-5 ? nd / l : vec2(0.);
  c.xy += nd * uWidth * uPx / uRes * 2. * c.w;
  vW = (modelMatrix * vec4(position,1.)).xyz;
  gl_Position = c;
}`;
const HULL_F = /* glsl */`
uniform vec3 uColor; uniform float uOpacity; uniform float uRevealY; uniform float uRevealDir;
varying vec3 vW;
void main(){
  if (uRevealDir > 0. && vW.y > uRevealY) discard;
  if (uRevealDir < 0. && vW.y < uRevealY) discard;
  if (uOpacity < 0.01) discard;
  gl_FragColor = vec4(uColor, uOpacity);
}`;
export function hullMaterial(opts = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: HULL_V, fragmentShader: HULL_F, side: THREE.BackSide, transparent: true,
    uniforms: {
      uRes: G.uRes, uPx: G.uPx, uWidth: { value: opts.width ?? 1.6 },
      uColor: { value: new THREE.Color(opts.color ?? 0x141210) }, uOpacity: { value: 1 },
      uRevealY: { value: 1e5 }, uRevealDir: { value: 0 },
    },
  });
}
