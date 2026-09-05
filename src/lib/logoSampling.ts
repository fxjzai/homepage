import { BufferAttribute, BufferGeometry, Color } from 'three';

export function createLogoGeometry(data: Float32Array, count: number) {
  const positions = new Float32Array(count * 3);
  const parameters = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const source = i * 7;
    positions.set(data.subarray(source, source + 3), i * 3);
    parameters.set([data[source + 3], data[source + 4], data[source + 5], data[source + 6]], i * 4);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aParameters', new BufferAttribute(parameters, 4));
  geometry.computeBoundingSphere();
  return geometry;
}

export function createStarGeometry(count: number) {
  let seed = 41230;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions.set([(random() - .5) * 20, (random() - .5) * 12, -1 - random() * 7], i * 3);
    sizes[i] = .55 + Math.pow(random(), 7) * 2.4;
    phases[i] = random() * 12;
    const color = new Color(random() > .91 ? '#8da5bd' : '#dde7ef').multiplyScalar(.2 + random() * .5);
    colors.set(color.toArray(), i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}
