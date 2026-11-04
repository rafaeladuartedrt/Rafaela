// Funções GLSL compartilhadas (ruído, fbm, hachura)
export const NOISE = /* glsl */`
float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise3(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  float n000=hash13(i), n100=hash13(i+vec3(1,0,0)), n010=hash13(i+vec3(0,1,0)), n110=hash13(i+vec3(1,1,0));
  float n001=hash13(i+vec3(0,0,1)), n101=hash13(i+vec3(1,0,1)), n011=hash13(i+vec3(0,1,1)), n111=hash13(i+vec3(1,1,1));
  return mix(mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y), mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y), f.z);
}
float vnoise2(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x), mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x), f.y);
}
float fbm3(vec3 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*vnoise3(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; } return s/.9375; }
float fbm2(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*vnoise2(p); p=p*2.02+vec2(5.1,1.3); a*=.5; } return s/.96875; }
`;

// paleta de ilustração (referência: laranja, creme, azul-acinzentado, cinza nanquim)
// recebe cor sRGB da referência e devolve tom chapado linear da ilustração
export const ILLUS = /* glsl */`
vec3 sl(vec3 c){ return pow(c, vec3(2.2)); }
vec3 illus(vec3 c, float jit){
  float L = dot(c, vec3(.299,.587,.114));
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  float sat = (mx - mn) / max(mx, 1e-3);
  vec3 ink = sl(vec3(.204,.212,.227)), slate = sl(vec3(.42,.49,.51)), grey = sl(vec3(.73,.71,.67)), cream = sl(vec3(.94,.905,.83));
  vec3 blue = sl(vec3(.62,.74,.77)), orange = sl(vec3(.91,.47,.24)), patina = sl(vec3(.46,.60,.60));
  float q = L + jit * 0.06;
  vec3 o = q < .2 ? ink : (q < .4 ? slate : (q < .63 ? grey : cream));
  // dourado / quente saturado -> laranja de destaque
  // pátina verde-azulada
  if (c.g > c.r + .03 && sat > .14 && L > .14) o = q < .32 ? slate : patina;
  // céu
  else if (c.b > c.r + .06 && L > .5) o = blue;
  return o;
}`;
