// Ajuste de ritmo: trechos de espera (em frames da cena original) passam mais rápido; as ações ficam intactas.
export type Seg = [number, number, number]; // [início, fim, velocidade]

// frame de saída -> frame da cena original (contínuo, funciona com o motion blur)
export const warpFrame = (fOut: number, segs: Seg[]) => {
  let src = 0;
  let out = 0;
  for (const [a, b, sp] of segs) {
    if (fOut <= out + (a - src)) return src + (fOut - out);
    out += a - src;
    src = a;
    const dOut = (b - a) / sp;
    if (fOut <= out + dOut) return src + (fOut - out) * sp;
    out += dOut;
    src = b;
  }
  return src + (fOut - out);
};
export const warpLen = (srcLen: number, segs: Seg[]) => Math.round(srcLen - segs.reduce((acc, [a, b, sp]) => acc + (b - a) * (1 - 1 / sp), 0));

export const WARP: Record<string, Seg[]> = {
  s1: [[64, 88, 1.3]],
  s2: [[96, 140, 1.6], [262, 298, 1.7]],
  s3: [[34, 58, 1.5]],
  s4: [[188, 226, 2.2]],
  s5: [[30, 60, 1.4], [110, 128, 1.4], [210, 226, 1.4]],
};
