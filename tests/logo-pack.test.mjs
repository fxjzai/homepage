import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { LOGO_PARTS, PACK_STRIDE, packParticles, unpackParticles } from '../src/lib/logoPack.ts';
import { buildLogoArrays } from '../src/lib/logoArrays.ts';

const svg = readFileSync(new URL('../public/assets/brand-mark.svg', import.meta.url), 'utf8');
const bin = readFileSync(new URL('../public/assets/logo-particles.bin', import.meta.url));
const source = new Float32Array(bin.buffer, bin.byteOffset, bin.byteLength / 4);
const parts = LOGO_PARTS.map(([start, end]) => packParticles(source, start, end));
const buffers = parts.map(part => part.buffer.slice(part.byteOffset, part.byteOffset + part.byteLength));

test('packed parts cover every GPU tier and stay far smaller than the float32 source', () => {
  assert.deepEqual(LOGO_PARTS.map(([start, end]) => end - start), [6500, 15500]);
  assert.equal(parts[0].length, 6500 * PACK_STRIDE);
  assert.ok(parts.reduce((sum, part) => sum + part.length, 0) < bin.length / 3);
});

test('decoding is visually lossless: sub-pixel positions, exact colour type and 79:21 ratio', () => {
  const decoded = unpackParticles(buffers);
  const tolerance = [2e-5, 2e-5, 2e-4, 0, 1e-5, 2.5e-3, 2e-3];
  for (let i = 0; i < 22000; i++) for (let k = 0; k < 7; k++) {
    assert.ok(Math.abs(decoded[i * 7 + k] - source[i * 7 + k]) <= tolerance[k], `particle ${i} field ${k}`);
  }
  // The narrow-screen tier decodes from the first part alone.
  const phone = unpackParticles(buffers.slice(0, 1));
  let red = 0;
  for (let i = 0; i < 6500; i++) red += phone[i * 7 + 3];
  assert.equal(red, 65 * 21);
});

test('worker-built attributes keep every logo grain inside its flow footprint and halos outside the logo', () => {
  const arrays = buildLogoArrays(unpackParticles(buffers.slice(0, 1)), 6500, 1100, true, svg);
  assert.equal(arrays.positions.length, 7600 * 3);
  for (let i = 0; i < 6500; i++) {
    assert.ok(arrays.softness[i] >= .42 && arrays.softness[i] <= 1);
    assert.ok(Math.hypot(arrays.paths[i * 4] - arrays.positions[i * 3], arrays.paths[i * 4 + 1] - arrays.positions[i * 3 + 1]) <= .14 + 1e-6);
  }
  for (let i = 6500; i < 7600; i++) {
    assert.equal(arrays.parameters[i * 4], 2);
    assert.ok(arrays.halos[i * 2] >= 1.04);
  }
});
