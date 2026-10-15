/// <reference lib="webworker" />
import { buildLogoArrays, transferables } from './logoArrays';
import { createLogoFlow } from './logoFlow';
import { unpackParticles } from './logoPack';
import logoSvg from '../../public/assets/brand-mark.svg?raw';
import type { LogoRequest } from './logoWorkerClient';

// Off-main-thread start-up work: decoding particle data and tracing flow paths inside the silhouette.
self.onmessage = ({ data: request }: MessageEvent<LogoRequest>) => {
  try {
    if (request.type === 'logo') {
      const arrays = buildLogoArrays(unpackParticles(request.buffers), request.count, request.haloCount, request.mobile, logoSvg);
      self.postMessage({ id: request.id, arrays }, transferables(arrays));
    } else {
      const flow = createLogoFlow(request.positions, request.kinds, request.seeds, logoSvg);
      self.postMessage({ id: request.id, arrays: flow }, transferables(flow));
    }
  } catch (error) {
    self.postMessage({ id: request.id, error: String(error) });
  }
};
