let sourcePromise: Promise<Float32Array> | undefined;

export function loadLogoTargets() {
  if (!sourcePromise) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);
    sourcePromise = fetch('/assets/logo-particles.bin', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Logo data unavailable'); return response.arrayBuffer(); })
      .then(buffer => {
        if (buffer.byteLength !== 26000 * 7 * 4) throw new Error('Invalid logo data');
        return new Float32Array(buffer);
      })
      .catch(error => { sourcePromise = undefined; throw error; })
      .finally(() => window.clearTimeout(timeout));
  }
  return sourcePromise;
}
