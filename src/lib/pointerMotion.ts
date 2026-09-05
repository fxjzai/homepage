/** Track pointer travel only; entry and camera movement must never inject momentum. */
export class PointerMotion {
  private x = 0;
  private y = 0;
  private tracking = false;
  reset() { this.tracking = false; }
  sample(x: number, y: number, active: boolean) {
    const dx = active && this.tracking ? x - this.x : 0;
    const dy = active && this.tracking ? y - this.y : 0;
    this.x = x; this.y = y; this.tracking = active;
    return { x: dx, y: dy };
  }
}

// Screen coordinates are measured in half viewport heights, independent of DPR.
export const PARTICLE_MOTION = { radius: .28, gain: 5.4, maxImpulse: .18, maxSpeed: .6, returnRate: 1, drag: 2.3, lifetime: 6 };
export type MotionStroke = { x: number; y: number; dx: number; dy: number };
export function particleMass(size: number, seed: number) {
  return .7 + .9 * seed * seed + Math.min(size / 14, 1) * .75;
}

/** Analytical integration of velocity drag and a gentle return to the rest shape. */
export function coastParticle(state: Float32Array, index: number, mass: number, seconds: number) {
  const drag = PARTICLE_MOTION.drag / Math.sqrt(mass);
  const vDecay = Math.exp(-drag * seconds);
  const pDecay = Math.exp(-PARTICLE_MOTION.returnRate * seconds);
  const carry = (pDecay - vDecay) / (drag - PARTICLE_MOTION.returnRate);
  state[index] = state[index] * pDecay + state[index + 2] * carry;
  state[index + 1] = state[index + 1] * pDecay + state[index + 3] * carry;
  state[index + 2] *= vDecay;
  state[index + 3] *= vDecay;
}

/** Apply a swipe to a particle's CURRENT position, not to its rest anchor. */
export function stirParticle(state: Float32Array, index: number, mass: number, x: number, y: number, stroke: MotionStroke) {
  const lengthSquared = stroke.dx * stroke.dx + stroke.dy * stroke.dy;
  if (lengthSquared < 1e-8) return;
  const rx = x + state[index] - (stroke.x - stroke.dx);
  const ry = y + state[index + 1] - (stroke.y - stroke.dy);
  const along = Math.max(0, Math.min(1, (rx * stroke.dx + ry * stroke.dy) / lengthSquared));
  const distance = Math.hypot(rx - along * stroke.dx, ry - along * stroke.dy);
  const t = Math.min(1, distance / PARTICLE_MOTION.radius);
  const weight = (1 - t * t * (3 - 2 * t)) ** 2;
  const gain = PARTICLE_MOTION.gain * weight / mass * Math.min(1, PARTICLE_MOTION.maxImpulse / Math.sqrt(lengthSquared));
  state[index + 2] += stroke.dx * gain;
  state[index + 3] += stroke.dy * gain;
  const limit = Math.min(1, PARTICLE_MOTION.maxSpeed / Math.max(.00001, Math.hypot(state[index + 2], state[index + 3])));
  state[index + 2] *= limit;
  state[index + 3] *= limit;
}
