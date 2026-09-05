import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createLogoFlow, flowPosition } from '../src/lib/logoFlow.ts';

const svg = readFileSync(new URL('../public/assets/brand-mark.svg', import.meta.url), 'utf8');
const bin = readFileSync(new URL('../public/assets/logo-particles.bin', import.meta.url));
const data = new Float32Array(bin.buffer, bin.byteOffset, bin.byteLength / 4);
const count = 22000, positions = new Float32Array(count * 3), kinds = new Float32Array(count), seeds = new Float32Array(count);
for (let i = 0; i < count; i++) {
  positions.set(data.subarray(i * 7, i * 7 + 3), i * 3); kinds[i] = data[i * 7 + 3]; seeds[i] = data[i * 7 + 4];
}
const flow = createLogoFlow(positions, kinds, seeds, svg);
const point = (i, t) => flowPosition(positions[i * 3], positions[i * 3 + 1], ...flow.paths.subarray(i * 4, i * 4 + 4), seeds[i], t);

// Independent ray crossing check against the supplied vector, not the flow grid.
const polygons = [...svg.matchAll(/ d="([^"]+)"/g)].map(match => {
  const numbers = match[1].match(/-?\d+(?:\.\d+)?/g).map(Number), p = [];
  for (let i = 0; i < numbers.length; i += 2) p.push([(numbers[i] - 525) / 564, (564 - numbers[i + 1]) / 564]);
  return p;
});
function inside(x, y, kind) {
  let hit = false; const p = polygons[kind];
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [ax, ay] = p[i], [bx, by] = p[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) hit = !hit;
  }
  return hit;
}

test('ambient motion remains inside the traced shape, allowing only subpixel edge softness', () => {
  let escaped = 0;
  for (let i = 0; i < count; i++) for (let t = 0; t < 16; t++) {
    const p = point(i, t);
    if (inside(p.x, p.y, kinds[i])) continue;
    // .004 local units is < 1 CSS px at a typical desktop logo scale.
    let near = false;
    for (let j = 0; j < 8; j++) if (inside(p.x + Math.cos(j * Math.PI / 4) * .004, p.y + Math.sin(j * Math.PI / 4) * .004, kinds[i])) near = true;
    if (!near) escaped++;
  }
  assert.equal(escaped, 0);
});

test('most grains visibly move while preserving the overall footprint', () => {
  let moving = 0;
  for (let i = 0; i < count; i++) {
    const a = point(i, 0), b = point(i, 2);
    if (Math.hypot(a.x - b.x, a.y - b.y) > .003) moving++;
    assert.ok(Math.hypot(a.x - positions[i * 3], a.y - positions[i * 3 + 1]) < .15);
  }
  assert.ok(moving > count * .9);
});

test('closed flow paths have continuous position and velocity at their joins', () => {
  for (let i = 0; i < count; i += 97) {
    const speed = .065 + seeds[i] * .035;
    for (let join = 1; join <= 3; join++) {
      const time = (1 + join / 3 - seeds[i]) / speed, epsilon = 1e-4;
      const a = point(i, time - epsilon), b = point(i, time), c = point(i, time + epsilon);
      assert.ok(Math.hypot(a.x - c.x, a.y - c.y) < .0001);
      assert.ok(Math.hypot((b.x - a.x) / epsilon - (c.x - b.x) / epsilon, (b.y - a.y) / epsilon - (c.y - b.y) / epsilon) < .001);
    }
  }
});
