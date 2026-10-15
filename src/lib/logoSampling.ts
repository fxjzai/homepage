import { BufferAttribute, BufferGeometry, Color } from 'three';
import type { LogoArrays } from './logoArrays';

/** Wraps precomputed attribute data (see logoArrays.ts); cheap enough for the render path. */
export function createLogoGeometry(arrays: LogoArrays) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(arrays.positions, 3));
  geometry.setAttribute('aParameters', new BufferAttribute(arrays.parameters, 4));
  geometry.setAttribute('aRing', new BufferAttribute(arrays.rings, 4));
  geometry.setAttribute('aHalo', new BufferAttribute(arrays.halos, 2));
  geometry.setAttribute('aFlow', new BufferAttribute(arrays.paths, 4));
  geometry.setAttribute('aSoftness', new BufferAttribute(arrays.softness, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export function createStarGeometry(count: number, aspect: number) {
  let seed = 41230;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const dust = i % 3 === 0;
    const depth = 5.8 + random() * 7;
    const halfHeight = depth * Math.tan(19 * Math.PI / 180);
    const radius = .4 + random() * 1.85;
    const angle = (i % 2) * Math.PI + radius * 2.1 + (random() - .5) * .8;
    // Generate against the viewport: distant stars should not mostly lie offscreen.
    const x = dust ? Math.cos(angle) * radius : (random() * 2 - 1) * aspect * 1.06;
    const y = dust ? Math.sin(angle) * radius * .72 : (random() * 2 - 1) * 1.06;
    positions.set([x * halfHeight, y * halfHeight, 4.8 - depth], i * 3);
    sizes[i] = dust ? 1.0 + random() * 1.4 : 1.2 + Math.pow(random(), 8) * 11;
    phases[i] = random() * 12;
    const color = new Color(random() > .82 ? '#ffc79d' : '#c4e5ff').multiplyScalar(dust ? .35 + random() * .3 : .55 + random() * .4);
    colors.set(color.toArray(), i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}
