export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const easeInOutCubic = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
// Curva suave que nunca zera a velocidade: a camera nunca para totalmente.
export const easeSoft = (t: number) => 0.22 * clamp01(t) + 0.78 * easeInOutCubic(t);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// progresso 0..1 de f dentro de [a, b], com easing
export const prog = (f: number, a: number, b: number, ease = easeInOutCubic) =>
  b <= a ? (f >= b ? 1 : 0) : ease((f - a) / (b - a));
