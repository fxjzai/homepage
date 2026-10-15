import partUrls from 'virtual:logo-pack';
import { LOGO_PARTS } from './logoPack';
import { particleBudget } from './particleBudget';

const parts = new Map<number, Promise<ArrayBuffer>>();

function loadPart(index: number) {
  let promise = parts.get(index);
  if (!promise) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);
    promise = fetch(partUrls[index], { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Logo data unavailable'); return response.arrayBuffer(); })
      .then(buffer => {
        const [start, end] = LOGO_PARTS[index];
        if (buffer.byteLength !== (end - start) * 10) throw new Error('Invalid logo data');
        return buffer;
      })
      // Failed parts may be retried on the next attempt.
      .catch(error => { parts.delete(index); throw error; })
      .finally(() => window.clearTimeout(timeout));
    parts.set(index, promise);
  }
  return promise;
}

/** Fetches only the parts covering `count` particles, in parallel. Raw buffers stay cached for retries. */
export function loadLogoBuffers(count: number) {
  return Promise.all(LOGO_PARTS.flatMap(([start], index) => start < count ? [loadPart(index)] : []));
}

/** Start the network requests early without decoding, for the current device tier. */
export function prefetchLogoTargets() {
  loadLogoBuffers(particleBudget().count).catch(() => {});
}
