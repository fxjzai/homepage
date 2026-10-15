/** Compact network format for the GPU particle data, derived at build time from
 * public/assets/logo-particles.bin (the float32 source asset, which stays unchanged).
 *
 * Planar little-endian layout, 10 bytes per particle, no header (count = bytes / 10):
 *   x int16 · y int16 · seed uint16 · z int8 · type uint8 · size uint8 · brightness uint8
 * Planes are ordered so every 16-bit plane stays 2-byte aligned.
 * x/y error ≤ 1.6e-5 logo units, well under 0.01 CSS px at any logo scale.
 */
export const PACK_STRIDE = 10;
export const SOURCE_STRIDE = 7;
/** Network parts: the narrow-screen tier needs only the first; wider tiers fetch both in parallel. */
export const LOGO_PARTS = [[0, 6500], [6500, 22000]] as const;
const Z_RANGE = .035, SIZE_MIN = .55, SIZE_SPAN = 1.15, LIGHT_MIN = .2, LIGHT_SPAN = .8;
const round = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));

export function packParticles(source: Float32Array, start: number, end: number) {
  const n = end - start, bytes = new Uint8Array(n * PACK_STRIDE);
  const view = new DataView(bytes.buffer);
  for (let j = 0; j < n; j++) {
    const s = (start + j) * SOURCE_STRIDE;
    view.setInt16(j * 2, round(source[s] * 32767, -32767, 32767), true);
    view.setInt16(n * 2 + j * 2, round(source[s + 1] * 32767, -32767, 32767), true);
    view.setUint16(n * 4 + j * 2, round(source[s + 4] * 65535, 0, 65535), true);
    view.setInt8(n * 6 + j, round(source[s + 2] / Z_RANGE * 127, -127, 127));
    bytes[n * 7 + j] = source[s + 3] > .5 ? 1 : 0;
    bytes[n * 8 + j] = round((source[s + 5] - SIZE_MIN) / SIZE_SPAN * 255, 0, 255);
    bytes[n * 9 + j] = round((source[s + 6] - LIGHT_MIN) / LIGHT_SPAN * 255, 0, 255);
  }
  return bytes;
}

/** Decodes one or more consecutive parts back into the 7-float source records. */
export function unpackParticles(parts: ArrayBuffer[]) {
  const total = parts.reduce((sum, part) => sum + part.byteLength / PACK_STRIDE, 0);
  if (!Number.isInteger(total)) throw new Error('Invalid logo data');
  const out = new Float32Array(total * SOURCE_STRIDE);
  let offset = 0;
  for (const part of parts) {
    const n = part.byteLength / PACK_STRIDE, view = new DataView(part);
    for (let j = 0; j < n; j++) {
      const o = (offset + j) * SOURCE_STRIDE;
      out[o] = view.getInt16(j * 2, true) / 32767;
      out[o + 1] = view.getInt16(n * 2 + j * 2, true) / 32767;
      out[o + 2] = view.getInt8(n * 6 + j) / 127 * Z_RANGE;
      out[o + 3] = view.getUint8(n * 7 + j);
      out[o + 4] = view.getUint16(n * 4 + j * 2, true) / 65535;
      out[o + 5] = SIZE_MIN + view.getUint8(n * 8 + j) / 255 * SIZE_SPAN;
      out[o + 6] = LIGHT_MIN + view.getUint8(n * 9 + j) / 255 * LIGHT_SPAN;
    }
    offset += n;
  }
  return out;
}
