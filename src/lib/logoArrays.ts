import { createLogoFlow } from './logoFlow.ts';
import { haloDepth, haloRadius, hash, ringAttributes } from './introPath.ts';

export type LogoArrays = {
  positions: Float32Array; parameters: Float32Array; rings: Float32Array; halos: Float32Array;
  paths: Float32Array; softness: Float32Array;
};

/** Pure attribute data for the GPU logo, free of Three.js so it can run in a worker.
 * Logo grains first, then `haloCount` orbit grains (kind 2) that never enter the silhouette. */
export function buildLogoArrays(data: Float32Array, count: number, haloCount: number, mobile: boolean, svg: string): LogoArrays {
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
  const kinds = new Float32Array(count), seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) { kinds[i] = parameters[i * 4]; seeds[i] = parameters[i * 4 + 1]; }
  const flow = createLogoFlow(positions.subarray(0, count * 3), kinds, seeds, svg);
  // Halo grains orbit instead of flowing: zero-length flow paths and no rim softening.
  const paths = new Float32Array(total * 4), softness = new Float32Array(total).fill(1);
  paths.set(flow.paths); softness.set(flow.softness);
  return { positions, parameters, rings, halos, paths, softness };
}

export const transferables = (arrays: Record<string, Float32Array>) => Object.values(arrays).map(array => array.buffer as ArrayBuffer);
