/** Small closed paths inside the original silhouette. No global orbit or rotation. */
export function createLogoFlow(positions: Float32Array, kinds: Float32Array, seeds: Float32Array, svg: string) {
  const viewBox = svg.match(/viewBox="([^"]+)"/)![1].split(/\s+/).map(Number);
  const width = viewBox[2], height = viewBox[3], scale = Math.max(width, height);
  const polygons = [...svg.matchAll(/ d="([^"]+)"/g)].map(match => {
    const numbers = match[1].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const polygon: number[][] = [];
    for (let i = 0; i < numbers.length; i += 2) polygon.push([(numbers[i] - width / 2) * 2 / scale, (height / 2 - numbers[i + 1]) * 2 / scale]);
    return polygon;
  });
  const inside = (x: number, y: number, kind: number) => {
    const polygon = polygons[kind]; let result = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [ax, ay] = polygon[i], [bx, by] = polygon[j];
      if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) result = !result;
    }
    return result;
  };
  const resolution = 256;
  const mask = new Uint8Array(resolution * resolution * 2);
  for (let kind = 0; kind < 2; kind++) for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) {
    mask[kind * resolution * resolution + y * resolution + x] = inside((x + .5) / resolution * 2 - 1, (y + .5) / resolution * 2 - 1, kind) ? 1 : 0;
  }
  const contained = (x: number, y: number, kind: number) => {
    const ix = Math.floor((x + 1) * resolution / 2), iy = Math.floor((y + 1) * resolution / 2);
    return ix >= 0 && ix < resolution && iy >= 0 && iy < resolution && mask[kind * resolution * resolution + iy * resolution + ix] === 1;
  };
  const segmentInside = (ax: number, ay: number, bx: number, by: number, kind: number) => {
    for (let j = 1; j < 16; j++) if (!contained(ax + (bx - ax) * j / 16, ay + (by - ay) * j / 16, kind)) return false;
    return true;
  };
  const cells = new Map<string, number[]>();
  const count = kinds.length, cellSize = .14;
  for (let i = 0; i < count; i++) {
    const key = `${kinds[i]}:${Math.floor(positions[i * 3] / cellSize)}:${Math.floor(positions[i * 3 + 1] / cellSize)}`;
    const cell = cells.get(key) ?? []; cell.push(i); cells.set(key, cell);
  }
  const paths = new Float32Array(count * 4), softness = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], kind = kinds[i];
    const cx = Math.floor(x / cellSize), cy = Math.floor(y / cellSize);
    let ax = x, ay = y, bx = x, by = y, found = 0;
    // Bounded search, independent of total particle count.
    for (let attempt = 0; attempt < 32 && found < 2; attempt++) {
      const dx = attempt % 3 - 1, dy = Math.floor(attempt / 3) % 3 - 1;
      const candidates = cells.get(`${kind}:${cx + dx}:${cy + dy}`);
      if (!candidates?.length) continue;
      const choice = candidates[Math.floor((seeds[i] * 157 + attempt * .61803398875) % 1 * candidates.length)];
      const px = positions[choice * 3], py = positions[choice * 3 + 1];
      const distance = Math.hypot(px - x, py - y);
      if (distance < .025 || distance > .14 || !segmentInside(x, y, px, py, kind) || !segmentInside(ax, ay, px, py, kind)) continue;
      if (found === 0) { ax = px; ay = py; } else { bx = px; by = py; }
      found++;
    }
    paths.set([ax, ay, bx, by], i * 4);
    let coverage = 0;
    for (let j = 0; j < 8; j++) {
      const angle = j / 8 * Math.PI * 2;
      if (contained(x + Math.cos(angle) * .012, y + Math.sin(angle) * .012, kind)) coverage++;
    }
    // Fade the tightly sampled rim rather than blurring the entire logo.
    softness[i] = .42 + .58 * coverage / 8;
  }
  return { paths, softness };
}

/** Quadratic arcs through edge midpoints give continuous speed at every join. */
export function flowPosition(x: number, y: number, ax: number, ay: number, bx: number, by: number, seed: number, time: number) {
  const phase = ((time * (.065 + seed * .035) + seed) % 1) * 3;
  const segment = Math.floor(phase), t = phase - segment, u = 1 - t;
  const px = segment === 0 ? bx : segment === 1 ? x : ax;
  const py = segment === 0 ? by : segment === 1 ? y : ay;
  const qx = segment === 0 ? x : segment === 1 ? ax : bx;
  const qy = segment === 0 ? y : segment === 1 ? ay : by;
  const rx = segment === 0 ? ax : segment === 1 ? bx : x;
  const ry = segment === 0 ? ay : segment === 1 ? by : y;
  return { x: u * u * (px + qx) * .5 + 2 * u * t * qx + t * t * (qx + rx) * .5,
    y: u * u * (py + qy) * .5 + 2 * u * t * qy + t * t * (qy + ry) * .5 };
}
