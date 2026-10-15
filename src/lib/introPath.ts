/** 「反向加载」开场：逆时针加载环加速旋转，星粒按序脱离并沿螺旋落入 Logo，剩余星粒倾斜成轨道光环。
 * GPU 着色器（src/scene/shaders/intro.ts）与 Canvas 2D 共用这些常量和方程。
 */
export const INTRO = {
  ringRadius: 1.22, ringWidth: .09, ringDepth: .06, fadeIn: .45,
  spinRate: 1.6, spinAccel: 2.2,
  departure: 1.2, redDelay: .5, arcDelay: .5, jitter: .25,
  flight: 1.35, flightJitter: .35,
  ignite: 4.2, igniteSpeed: 2.4, sweepStart: 4.8,
  haloRelease: 2.6, haloSettle: 4.4, haloTilt: -1.2, haloRoll: .32, haloRate: .32,
};
export const TAU = Math.PI * 2;
const mod = (x: number, y: number) => x - y * Math.floor(x / y);
export const smoothstep = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const hash = (x: number) => { const value = Math.sin(x * 127.1) * 43758.5453; return value - Math.floor(value); };

/** [theta0, ringRadius, ringZ, jitter] for one grain on the loading ring. */
export function ringAttributes(index: number) {
  return [hash(index * .731 + 3.1) * TAU, INTRO.ringRadius + (hash(index * 1.37 + 7.7) - .5) * INTRO.ringWidth,
    (hash(index * 2.11 + 1.9) - .5) * INTRO.ringDepth, hash(index * .53 + 9.3)];
}
/** Halo orbit radius, denser near the logo; narrow screens use a tighter band. */
export const haloRadius = (index: number, mobile: boolean) => (mobile ? 1.04 : 1.28) + Math.pow(hash(index * 3.17 + 4.4), 1.6) * (mobile ? .22 : .5);
export const haloDepth = (index: number) => (hash(index * 5.03 + 2.6) - .5) * .08;

/** Shockwave that runs outward from the logo centre once every grain has landed. */
export function igniteWave(radius: number, t: number) {
  const elapsed = t - INTRO.ignite;
  if (elapsed < 0) return 0;
  const distance = (radius - elapsed * INTRO.igniteSpeed) * 5;
  return Math.exp(-distance * distance) * (1 - smoothstep(0, 1.4, elapsed)) + Math.exp(-elapsed * 3) * .35;
}
/** Slow diagonal energy band crossing the logo, opposite to the slash sweep. */
export function shimmer(x: number, y: number, seed: number, time: number) {
  const wave = .5 + .5 * Math.sin((x * .8 - y * .6) * 7 - time * 1.1 + seed * .6);
  return .82 + .36 * wave * wave * wave * wave;
}
export const hoverGlow = (distance: number, intensity: number) => Math.exp(-distance * distance * 28) * intensity;

export const ringSpin = (t: number) => INTRO.spinRate * t + .5 * INTRO.spinAccel * t * t;
export const ringRate = (t: number) => INTRO.spinRate + INTRO.spinAccel * t;
/** Loading-arc brightness: bright leading head, fading tail. */
export const ringGlow = (theta0: number, t: number) => { const arc = theta0 / TAU; return (.14 + .86 * arc * arc * arc) * smoothstep(0, INTRO.fadeIn, t); };
export const departureTime = (kind: number, theta0: number, jitter: number) =>
  INTRO.departure + kind * INTRO.redDelay + (1 - theta0 / TAU) * INTRO.arcDelay + jitter * INTRO.jitter;
export const flightTime = (seed: number) => INTRO.flight + seed * INTRO.flightJitter;

/** Leaves with the ring's angular speed and settles with zero speed. The angle is a cubic Hermite
 * whose tangent ratio stays ≤ 2, so particles never spin backwards mid-flight. */
export function introPlace(theta0: number, ringR: number, ringZ: number, rx: number, ry: number, rz: number,
  driftX: number, driftY: number, start: number, flight: number, t: number) {
  const ringAngle = theta0 + ringSpin(Math.min(t, start));
  if (t <= start) return { x: Math.cos(ringAngle) * ringR, y: Math.sin(ringAngle) * ringR, z: ringZ, progress: 0 };
  const s = Math.min(1, (t - start) / flight);
  if (s >= 1) return { x: rx + driftX, y: ry + driftY, z: rz, progress: 1 };
  const m0 = ringRate(start) * flight;
  const sweep = m0 * .5 + mod(Math.atan2(ry, rx + 1e-6) - ringAngle - m0 * .5, TAU);
  const s2 = s * s, s3 = s2 * s, ease = 3 * s2 - 2 * s3;
  const angle = ringAngle + (s3 - 2 * s2 + s) * m0 + ease * sweep;
  const radius = ringR + (Math.hypot(rx, ry) - ringR) * ease;
  return { x: Math.cos(angle) * radius + driftX * ease, y: Math.sin(angle) * radius + driftY * ease, z: ringZ + (rz - ringZ) * ease, progress: s };
}

/** Halo particles stay on the loading ring, then brake to a Keplerian orbit on a tilted plane. */
export const orbitRate = (radius: number) => INTRO.haloRate * Math.pow(1.5 / radius, 1.5);
export function haloSpin(t: number, rate: number) {
  const { haloRelease: t1, haloSettle: t2 } = INTRO;
  const a = Math.min(t, t1), w1 = ringRate(t1), b = Math.max(0, Math.min(t - t1, t2 - t1));
  return ringSpin(a) + w1 * b + .5 * (rate - w1) / (t2 - t1) * b * b + rate * Math.max(0, t - t2);
}
export function haloPlace(theta0: number, ringR: number, ringZ: number, orbitR: number, orbitZ: number, t: number) {
  const angle = theta0 + haloSpin(t, orbitRate(orbitR));
  const k = smoothstep(INTRO.haloRelease + .1, INTRO.haloSettle + .2, t);
  const r = ringR + (orbitR - ringR) * k, z = ringZ + (orbitZ - ringZ) * k;
  const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
  const tilt = INTRO.haloTilt * k, roll = INTRO.haloRoll * k;
  const ty = y * Math.cos(tilt) - z * Math.sin(tilt), tz = y * Math.sin(tilt) + z * Math.cos(tilt);
  return { x: x * Math.cos(roll) - ty * Math.sin(roll), y: x * Math.sin(roll) + ty * Math.cos(roll), z: tz, settle: k };
}
