// Movimento da seta guiado por física: trajetória contínua (Catmull-Rom), orientação pela velocidade
// e animação secundária (inclinação, esticar/amassar e cauda) simulada por molas, frame a frame.
export type PoseKey = {f: number; x: number; y: number; z?: number; rest?: number};

const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
const easeIO = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export const pathAt = (keys: PoseKey[], f: number) => {
  if (f <= keys[0].f) return {x: keys[0].x, y: keys[0].y, z: keys[0].z ?? 1, rest: keys[0].rest ?? 0};
  const last = keys[keys.length - 1];
  if (f >= last.f) return {x: last.x, y: last.y, z: last.z ?? 1, rest: last.rest ?? 0};
  let i = 0;
  while (keys[i + 1].f < f) i++;
  const k0 = keys[Math.max(0, i - 1)];
  const k1 = keys[i];
  const k2 = keys[i + 1];
  const k3 = keys[Math.min(keys.length - 1, i + 2)];
  let t = (f - k1.f) / (k2.f - k1.f);
  // só a primeira e a última viagem têm aceleração/desaceleração; no meio a velocidade é contínua
  if (i === 0 || i === keys.length - 2) t = easeIO(t);
  const z = (a: PoseKey) => a.z ?? 1;
  const r = (a: PoseKey) => a.rest ?? 0;
  return {
    x: cr(k0.x, k1.x, k2.x, k3.x, t),
    y: cr(k0.y, k1.y, k2.y, k3.y, t),
    z: Math.max(0.02, cr(z(k0), z(k1), z(k2), z(k3), t)),
    rest: r(k1) + (r(k2) - r(k1)) * easeIO(t),
  };
};

const TIP = -109.6; // ângulo para onde a ponta aponta com rotação 0
const angDiff = (a: number, b: number) => {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
};

export type ArrowState = {x: number; y: number; z: number; rot: number; stretch: number; bend: number; wobble: number};

// Simula do frame inicial até f (determinístico)
export const simulateArrow = (keys: PoseKey[], f: number, opts: {lead?: number; f0?: number} = {}): ArrowState => {
  const f0 = opts.f0 ?? keys[0].f;
  const lead = opts.lead ?? 1; // quanto a ponta acompanha a direção do movimento
  let rot = pathAt(keys, f0).rest;
  let rotV = 0;
  let st = 1;
  let stV = 0;
  let bend = 0;
  let bendV = 0;
  let prev = pathAt(keys, f0 - 1);
  let prevSpeed = 0;
  let cur = pathAt(keys, f0);
  const steps = Math.max(0, Math.round((f - f0) * 2));
  for (let s = 1; s <= steps; s++) {
    const t = f0 + s / 2;
    const p = pathAt(keys, t);
    const vx = (p.x - prev.x) * 2;
    const vy = (p.y - prev.y) * 2;
    const speed = Math.hypot(vx, vy) / Math.max(0.3, p.z);
    // orientação: em repouso fica na pose, em movimento a ponta mira a direção da viagem
    const heading = (Math.atan2(vy, vx) * 180) / Math.PI - TIP;
    const k = Math.min(1, speed / 22) * lead;
    const target = p.rest + angDiff(p.rest, heading) * k;
    const prevRot = rot;
    rotV += (angDiff(rot, target) * 0.18 - rotV * 0.32) * 0.5;
    rot += rotV;
    // esticar com a velocidade, amassar ao frear (mola com pouco amortecimento = gelatina)
    const accel = (speed - prevSpeed) * 2;
    const stTarget = 1 + Math.min(0.2, speed * 0.006) + Math.max(-0.22, Math.min(0, accel * 0.012));
    stV += ((stTarget - st) * 0.35 - stV * 0.22) * 0.5;
    st += stV;
    // cauda fica para trás quando a seta gira
    const angVel = (rot - prevRot) * 2;
    bendV += ((-angVel * 0.035 - bend) * 0.3 - bendV * 0.25) * 0.5;
    bend += bendV;
    prev = p;
    prevSpeed = speed;
    cur = p;
  }
  return {x: cur.x, y: cur.y, z: cur.z, rot, stretch: Math.max(0.78, Math.min(1.22, st)), bend: Math.max(-0.32, Math.min(0.32, bend)), wobble: Math.min(0.12, Math.abs(stV) * 0.8)};
};
