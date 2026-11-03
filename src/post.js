// Composição final: papel (grão, fibras, luz rasante), profundidade de campo, motion blur,
// céu em aguada, transições (wipe de tinta, dissolve), vinheta e conversão para sRGB.
import * as THREE from 'three';
import { NOISE } from './glsl.js';
import { G } from './globals.js';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tA; uniform sampler2D tDA; uniform sampler2D tB; uniform sampler2D tDB;
uniform vec2 uRes; uniform float uPx; uniform float uFrame;
uniform vec4 uCamA; uniform vec4 uCamB;            // near, far, focus, aperture(px)
uniform vec2 uMBA; uniform vec2 uMBB;              // vetor de motion blur em px
uniform vec4 uPaperA; uniform vec4 uPaperB;        // offset.xy, escala.xy para uv do papel
uniform vec3 uSkyA; uniform vec3 uSkyB;            // amt, warm, (livre)
uniform float uTrans; uniform float uTransT; uniform vec2 uTransC;
uniform float uPaperAmt; uniform float uRake; uniform vec2 uLight;
uniform float uWhite; uniform float uVig; uniform float uExposure; uniform float uWarm;
uniform vec3 uPaper; uniform vec3 uInk;
${NOISE}
float linz(float d, vec4 cam){ float z = d * 2. - 1.; return 2. * cam.x * cam.y / (cam.y + cam.x - z * (cam.y - cam.x)); }
vec3 skyWash(vec2 uv, vec3 sk){
  float n = fbm2(uv * vec2(2.2, 3.5) + 3.7), n2 = fbm2(uv * 7. + 1.3);
  vec3 top = mix(vec3(.50,.62,.72), vec3(.42,.47,.62), sk.y);
  vec3 hor = mix(vec3(.86,.84,.78), vec3(.98,.70,.42), sk.y);
  vec3 c = mix(hor, top, smoothstep(.15, .95, uv.y + (n - .5) * .25));
  float mask = smoothstep(.25, .55, n * .8 + uv.y * .45 + n2 * .15);
  return mix(uPaper, c, mask * sk.x);
}
vec3 sampleScene(sampler2D t, sampler2D td, vec2 uv, vec4 cam, vec2 mb, vec3 sky){
  vec3 c = texture2D(t, uv).rgb;
  float d = texture2D(td, uv).r;
  if (length(mb) > 0.75) {
    vec3 acc = vec3(0.); float w = 0.;
    for (int i = 0; i < 14; i++) { float k = float(i) / 13. - .5; vec2 o = mb * k / uRes; acc += texture2D(t, uv + o).rgb; w += 1.; }
    c = acc / w;
  } else if (cam.w > 0.05) {
    float zc = linz(d, cam);
    float coc = clamp(abs(zc - cam.z) / max(zc, 0.01) * cam.w, 0., 18.) * uPx;
    if (coc > 0.6) {
      vec3 acc = c; float w = 1.;
      for (int i = 0; i < 28; i++) {
        float fi = float(i) + .5; float r = sqrt(fi / 28.) * coc; float a = fi * 2.39996;
        vec2 o = vec2(cos(a), sin(a)) * r / uRes;
        float ds = texture2D(td, uv + o).r; float zs = linz(ds, cam);
        float cs = clamp(abs(zs - cam.z) / max(zs, 0.01) * cam.w, 0., 18.) * uPx;
        float ww = smoothstep(r - 1., r + 1., cs + 1.5);
        acc += texture2D(t, uv + o).rgb * ww; w += ww;
      }
      c = acc / w;
    }
  }
  if (d > 0.99999) c = sky.x > 0.001 ? skyWash(uv, sky) : c;
  return c;
}
float paperH(vec2 p){
  float h = fbm2(p * 3.0) * .4 + fbm2(p * 26.) * .3 + vnoise2(p * 180.) * .1 + vnoise2(p * 520.) * .04;
  float fib = vnoise2(vec2(p.x * 90., p.y * 16.) + fbm2(p * 6.) * 3.);
  h += smoothstep(.8, .9, fib) * .04;
  return h;
}
vec3 paperize(vec3 c, vec2 uv, vec4 pt){
  vec2 p = (uv * uRes / uRes.y) * pt.zw + pt.xy;
  float h = paperH(p);
  float e = 0.002;
  float hx = paperH(p + vec2(e, 0.)) - h, hy = paperH(p + vec2(0., e)) - h;
  float rake = 1. + uRake * clamp(-(hx * uLight.x + hy * uLight.y) / e * 0.004, -0.35, 0.35);
  float mul = (0.955 + 0.06 * h) * rake;
  float spot = smoothstep(.83, .9, vnoise2(p * 140.)) * .05;
  return c * mix(1., mul - spot, uPaperAmt);
}
void main(){
  vec2 uv = vUv;
  vec3 a = paperize(sampleScene(tA, tDA, uv, uCamA, uMBA, uSkyA), uv, uPaperA);
  vec3 col = a;
  if (uTrans > 0.5) {
    vec3 b = paperize(sampleScene(tB, tDB, uv, uCamB, uMBB, uSkyB), uv, uPaperB);
    if (uTrans < 1.5) {
      // wipe de tinta: mancha orgânica que se expande com borda de nanquim
      vec2 q = (uv - uTransC) * vec2(uRes.x / uRes.y, 1.);
      float n = fbm2(uv * 6. + 2.) * .22 + fbm2(uv * 28.) * .05;
      float f = length(q) + n - uTransT * 1.45;
      float m = 1. - smoothstep(-0.005, 0.005, f);
      float edge = (1. - smoothstep(0.0, 0.018, abs(f + 0.012))) * step(0.02, uTransT) * step(uTransT, .98);
      col = mix(a, b, m);
      col = mix(col, uInk, edge * .92);
    } else {
      col = mix(a, b, smoothstep(0., 1., uTransT));
    }
  }
  // retorno ao papel em branco
  col = mix(col, uPaper * (0.96 + 0.04 * fbm2(uv * 30.)), uWhite);
  // grade de cor
  col *= uExposure;
  col = mix(col, col * vec3(1.06, 1.0, 0.9), uWarm);
  vec2 vq = uv - .5; col *= 1. - uVig * dot(vq, vq) * 1.6;
  col += (hash12(uv * uRes + uFrame * 17.31) - .5) * 0.018;
  col = clamp(col, 0., 1.);
  // linear -> sRGB
  col = mix(col * 12.92, 1.055 * pow(col, vec3(1. / 2.4)) - .055, step(0.0031308, col));
  gl_FragColor = vec4(col, 1.);
}`;

export class Post {
  constructor(renderer, w, h) {
    this.r = renderer;
    const mk = () => {
      const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter });
      rt.depthTexture = new THREE.DepthTexture(w, h); rt.depthTexture.type = THREE.UnsignedIntType;
      return rt;
    };
    this.rtA = mk(); this.rtB = mk();
    this.u = {
      tA: { value: this.rtA.texture }, tDA: { value: this.rtA.depthTexture }, tB: { value: this.rtB.texture }, tDB: { value: this.rtB.depthTexture },
      uRes: G.uRes, uPx: G.uPx, uFrame: { value: 0 },
      uCamA: { value: new THREE.Vector4(0.1, 1000, 10, 0) }, uCamB: { value: new THREE.Vector4(0.1, 1000, 10, 0) },
      uMBA: { value: new THREE.Vector2() }, uMBB: { value: new THREE.Vector2() },
      uPaperA: { value: new THREE.Vector4(0, 0, 1, 1) }, uPaperB: { value: new THREE.Vector4(0, 0, 1, 1) },
      uSkyA: { value: new THREE.Vector3() }, uSkyB: { value: new THREE.Vector3() },
      uTrans: { value: 0 }, uTransT: { value: 0 }, uTransC: { value: new THREE.Vector2(.5, .5) },
      uPaperAmt: { value: 1 }, uRake: { value: 0 }, uLight: { value: new THREE.Vector2(0.7, 0.7) },
      uWhite: { value: 0 }, uVig: { value: 0.25 }, uExposure: { value: 1 }, uWarm: { value: 0 },
      uPaper: G.uPaper, uInk: G.uInk,
    };
    this.mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.u, depthTest: false, depthWrite: false });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.scene = new THREE.Scene(); this.scene.add(this.quad);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  render() { this.r.setRenderTarget(null); this.r.render(this.scene, this.cam); }
}
