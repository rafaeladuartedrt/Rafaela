// Themis como ilustração chapada sobre a empena sul (nada de 3D): traço de nanquim que surge,
// tons da paleta que entram por mancha e sombra projetada na parede.
import * as THREE from 'three';
import { NOISE, ILLUS } from './glsl.js';
import { G } from './globals.js';
import { B } from './building.js';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const FRAG = /* glsl */`
varying vec2 vUv;
uniform sampler2D tC; uniform sampler2D tL; uniform sampler2D tM;
uniform float uDraw; uniform float uFill; uniform vec2 uShadow; uniform vec3 uPaper; uniform vec3 uInk;
${NOISE}
${ILLUS}
void main(){
  // a malha é 20% maior que a figura para caber a sombra; uv da figura:
  vec2 uv = (vUv - 0.5) * 1.2 + 0.5;
  vec2 tuv = vec2(uv.x, uv.y);
  float inF = step(0., uv.x) * step(uv.x, 1.) * step(0., uv.y) * step(uv.y, 1.);
  float m = texture2D(tM, tuv).r * inF;
  vec2 su = uv - uShadow;
  float ms = texture2D(tM, su).r * step(0., su.x) * step(su.x, 1.) * step(0., su.y) * step(su.y, 1.);
  float key = 1. - uv.y + (fbm2(uv * 6.) - .5) * .25;
  float drawn = smoothstep(0., .04, uDraw * 1.3 - .15 - key);
  float line = smoothstep(.2, .62, 1. - dot(texture2D(tL, tuv).rgb, vec3(.333))) * drawn;
  float edge = smoothstep(.25, .5, m) * (1. - smoothstep(.5, .75, m));
  vec3 col = illus(texture2D(tC, tuv, 2.).rgb, fbm2(uv * 30.) - .5);
  float fk = smoothstep(0., .03, uFill * 1.4 - .2 - (length((uv - vec2(.5, .82)) * vec2(.4, 1.)) + (fbm2(uv * 5. + 2.) - .5) * .3));
  float a = smoothstep(.4, .6, m);
  vec3 c = mix(uPaper, col, fk);
  c = mix(c, uInk, clamp(line * .92 + edge * drawn * .9, 0., 1.));
  float alpha = max(a * max(drawn, fk), edge * drawn);
  // sombra da escultura na parede
  float sh = smoothstep(.4, .6, ms) * (1. - a) * uFill * .32;
  if (alpha < .02 && sh < .01) discard;
  gl_FragColor = alpha > .02 ? vec4(c, 1.) : vec4(uInk * .3, sh);
}`;

export async function buildThemis2D() {
  const L = new THREE.TextureLoader();
  const load = (u) => new Promise((r, j) => L.load(u, r, undefined, j));
  const [c, l, m] = await Promise.all(['themis_cut.jpg', 'themis_cut_lines.jpg', 'themis_cut_mask.png'].map((f) => load('../assets/photos/' + f)));
  for (const t of [c, l, m]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; }
  const H = 9.4, W = H * 1080 / 2760;
  const g = new THREE.PlaneGeometry(W * 1.2, H * 1.2);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    uniforms: { tC: { value: c }, tL: { value: l }, tM: { value: m }, uDraw: { value: 1 }, uFill: { value: 1 }, uShadow: { value: new THREE.Vector2(-0.05, -0.03) }, uPaper: G.uPaper, uInk: G.uInk },
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.set(B.L / 2 + 0.06, 14.2 + H / 2 - 0.3, -0.4);
  mesh.rotation.y = Math.PI / 2;
  mesh.renderOrder = 5;
  mesh.userData = { u: mat.uniforms };
  return mesh;
}
