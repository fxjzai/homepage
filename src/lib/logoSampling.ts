import { BufferAttribute, BufferGeometry, Color } from 'three';
import { createLogoFlow } from './logoFlow';
import { haloDepth, haloRadius, hash, ringAttributes } from './introPath';
import logoSvg from '../../public/assets/brand-mark.svg?raw';

/** Logo grains first, then `haloCount` orbit grains (kind 2) that never enter the silhouette. */
export function createLogoGeometry(data: Float32Array, count: number, haloCount: number, mobile: boolean) {
  const total = count + haloCount;
  const positions = new Float32Array(total * 3);
  const parameters = new Float32Array(total * 4);
  const rings = new Float32Array(total * 4);
  const halos = new Float32Array(total * 2);
  for (let i = 0; i < count; i++) {
    const source = i * 7;
    positions.set(data.subarray(source, source + 3), i * 3);
    parameters.set([data[source + 3], data[source + 4], data[source + 5], data[source + 6]], i * 4);
  }
  for (let i = 0; i < total; i++) rings.set(ringAttributes(i), i * 4);
  for (let i = count; i < total; i++) {
    const seed = hash(i * .917 + 5.5);
    parameters.set([2, seed, .55 + hash(i * 1.93 + .7) * .7, .25 + hash(i * 2.71 + 3.3) * .7], i * 4);
    halos.set([haloRadius(i, mobile), haloDepth(i)], i * 2);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aParameters', new BufferAttribute(parameters, 4));
  geometry.setAttribute('aRing', new BufferAttribute(rings, 4));
  geometry.setAttribute('aHalo', new BufferAttribute(halos, 2));
  const kinds = new Float32Array(count), seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) { kinds[i] = parameters[i * 4]; seeds[i] = parameters[i * 4 + 1]; }
  const flow = createLogoFlow(positions.subarray(0, count * 3), kinds, seeds, logoSvg);
  // Halo grains orbit instead of flowing: zero-length flow paths and no rim softening.
  const paths = new Float32Array(total * 4), softness = new Float32Array(total).fill(1);
  paths.set(flow.paths); softness.set(flow.softness);
  geometry.setAttribute('aFlow', new BufferAttribute(paths, 4));
  geometry.setAttribute('aSoftness', new BufferAttribute(softness, 1));
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
