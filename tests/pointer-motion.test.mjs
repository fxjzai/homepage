import assert from 'node:assert/strict';
import { test } from 'node:test';
import { coastParticle, particleMass, PointerMotion, stirParticle, PARTICLE_MOTION } from '../src/lib/pointerMotion.ts';

test('entering, holding still, and re-entering never manufacture an impulse', () => {
  const input = new PointerMotion();
  assert.deepEqual(input.sample(.6, .2, true), { x: 0, y: 0 });
  assert.deepEqual(input.sample(.6, .2, true), { x: 0, y: 0 });
  assert.ok(input.sample(.8, .2, true).x > 0);
  input.sample(-.9, -.9, false);
  assert.deepEqual(input.sample(.9, .9, true), { x: 0, y: 0 });
  input.reset();
  assert.deepEqual(input.sample(-.5, -.5, true), { x: 0, y: 0 });
});

test('a fast swipe catches particles between its endpoints, without teleporting them', () => {
  const state = new Float32Array(4);
  stirParticle(state, 0, 1, 0, 0, { x: .8, y: 0, dx: 1.6, dy: 0 });
  assert.equal(state[0], 0);
  assert.ok(state[2] > .5);
  assert.equal(state[3], 0);
  coastParticle(state, 0, 1, 1 / 60);
  assert.ok(state[0] > 0 && state[0] < .01);
});

test('force follows the displaced particle rather than its original anchor', () => {
  const state = new Float32Array([.7, 0, 0, 0]);
  stirParticle(state, 0, 1, 0, 0, { x: .8, y: 0, dx: .2, dy: 0 });
  assert.ok(state[2] > 0);
  const far = new Float32Array([-.7, 0, 0, 0]);
  stirParticle(far, 0, 1, 0, 0, { x: .8, y: 0, dx: .2, dy: 0 });
  assert.equal(far[2], 0);
});

test('individual masses react differently and repeated stirring stays bounded', () => {
  const light = new Float32Array(4), heavy = new Float32Array(4);
  const stroke = { x: .01, y: 0, dx: .01, dy: 0 };
  stirParticle(light, 0, particleMass(1, .1), 0, 0, stroke);
  stirParticle(heavy, 0, particleMass(10, .9), 0, 0, stroke);
  assert.ok(light[2] > heavy[2] * 2);
  for (let i = 0; i < 1000; i++) stirParticle(light, 0, 1, 0, 0, stroke);
  assert.ok(Math.hypot(light[2], light[3]) <= PARTICLE_MOTION.maxSpeed + 1e-6);
});

test('analytical coasting agrees at 30/60/120 Hz and retains a natural multi-second tail', () => {
  const exact = new Float32Array([.1, -.1, .4, .2]);
  coastParticle(exact, 0, 1.4, 2);
  assert.ok(Math.hypot(exact[0], exact[1]) > .01);
  for (const hz of [30, 60, 120]) {
    const stepped = new Float32Array([.1, -.1, .4, .2]);
    for (let i = 0; i < hz * 2; i++) coastParticle(stepped, 0, 1.4, 1 / hz);
    for (let i = 0; i < 4; i++) assert.ok(Math.abs(exact[i] - stepped[i]) < 1e-6);
  }
  coastParticle(exact, 0, 1.4, 4);
  assert.ok(Math.hypot(exact[0], exact[1]) < .002);
});
