import assert from 'node:assert/strict';
import { test } from 'node:test';
import { departureTime, flightTime, haloPlace, haloRadius, haloSpin, INTRO, introPlace, orbitRate, ringAttributes, ringRate, TAU } from '../src/lib/introPath.ts';

const samples = Array.from({ length: 400 }, (_, i) => {
  const [theta0, ringR, ringZ, jitter] = ringAttributes(i);
  const angle = (i * 2.399) % TAU, radius = .15 + (i % 17) / 20;
  return { theta0, ringR, ringZ, jitter, kind: i % 5 === 0 ? 1 : 0, seed: (i * .618) % 1, rest: [Math.cos(angle) * radius, Math.sin(angle) * radius, (i % 7 - 3) * .01] };
});
const place = (p, t) => introPlace(p.theta0, p.ringR, p.ringZ, ...p.rest, 0, 0, departureTime(p.kind, p.theta0, p.jitter), flightTime(p.seed), t);

test('every grain lands exactly on its rest point before the ignition wave', () => {
  for (const p of samples) {
    const landed = departureTime(p.kind, p.theta0, p.jitter) + flightTime(p.seed);
    assert.ok(landed <= INTRO.ignite + 1e-6, `landed at ${landed}`);
    const end = place(p, INTRO.ignite);
    assert.deepEqual([end.x, end.y, end.z], p.rest);
    assert.equal(end.progress, 1);
  }
});

test('departure and landing are continuous in position', () => {
  for (const p of samples) {
    const start = departureTime(p.kind, p.theta0, p.jitter), end = start + flightTime(p.seed);
    for (const edge of [start, end]) {
      const a = place(p, edge - 1e-5), b = place(p, edge + 1e-5);
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1e-3);
    }
  }
});

test('grains leave with the ring\'s speed and never reverse direction mid-flight', () => {
  for (const p of samples) {
    const start = departureTime(p.kind, p.theta0, p.jitter), flight = flightTime(p.seed);
    let previous = Math.atan2(place(p, start).y, place(p, start).x);
    for (let j = 1; j <= 200; j++) {
      const q = place(p, start + flight * j / 200);
      const angle = Math.atan2(q.y, q.x);
      const step = (angle - previous + 3 * Math.PI) % TAU - Math.PI;
      // Near the centre the angle is ill-conditioned; only check on the ring-sized part of the path.
      if (Math.hypot(q.x, q.y) > .2) assert.ok(step > -1e-3, `reverse step ${step}`);
      previous = angle;
    }
    const e = 1e-4, a = place(p, start + e), b = place(p, start + 2 * e);
    const speed = Math.hypot(b.x - a.x, b.y - a.y) / e;
    assert.ok(Math.abs(speed - ringRate(start) * p.ringR) / (ringRate(start) * p.ringR) < .05);
  }
});

test('halo spin is continuous and settles into a slow orbit', () => {
  const rate = orbitRate(1.4);
  for (const t of [INTRO.haloRelease, INTRO.haloSettle]) {
    assert.ok(Math.abs(haloSpin(t - 1e-6, rate) - haloSpin(t + 1e-6, rate)) < 1e-4);
  }
  const late = (haloSpin(20, rate) - haloSpin(19, rate));
  assert.ok(Math.abs(late - rate) < 1e-9 && rate > 0 && rate < 1);
  const orbit = haloPlace(1, 1.2, 0, 1.4, 0, 30);
  assert.equal(orbit.settle, 1);
  // The tilted orbit is a flattened ellipse around the logo, wider than tall.
  let maxX = 0, maxY = 0;
  for (let a = 0; a < TAU; a += .05) { const q = haloPlace(a, 1.2, 0, 1.4, 0, 30); maxX = Math.max(maxX, Math.abs(q.x)); maxY = Math.max(maxY, Math.abs(q.y)); }
  assert.ok(maxX > 1.3 && maxY < .8);
  for (let i = 0; i < 2000; i++) assert.ok(haloRadius(i, false) >= 1.28 && haloRadius(i, true) <= 1.26 + 1e-9);
});
