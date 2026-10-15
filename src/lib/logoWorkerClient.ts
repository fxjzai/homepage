import { buildLogoArrays, type LogoArrays } from './logoArrays';
import { createLogoFlow } from './logoFlow';
import { unpackParticles } from './logoPack';
import logoSvg from '../../public/assets/brand-mark.svg?raw';
// Inlined as a blob: no extra network round trip before the flow paths are ready.
import LogoWorker from './logo.worker.ts?worker&inline';

type LogoJob = { type: 'logo'; buffers: ArrayBuffer[]; count: number; haloCount: number; mobile: boolean };
type FlowJob = { type: 'flow'; positions: Float32Array; kinds: Float32Array; seeds: Float32Array };
export type LogoRequest = (LogoJob | FlowJob) & { id: number };
type Flow = { paths: Float32Array; softness: Float32Array };

let worker: Worker | null | undefined;
let nextId = 0;
const pending = new Map<number, { resolve: (value: never) => void; reject: (error: Error) => void }>();

function getWorker() {
  if (worker !== undefined) return worker;
  try {
    worker = new LogoWorker({ name: 'logo' });
    worker.onmessage = ({ data }) => {
      const job = pending.get(data.id); pending.delete(data.id);
      if (data.error) job?.reject(new Error(data.error)); else job?.resolve(data.arrays as never);
    };
    worker.onerror = () => { worker?.terminate(); worker = null; for (const job of pending.values()) job.reject(new Error('Logo worker failed')); pending.clear(); };
  } catch { worker = null; }
  return worker;
}

/** Runs in the worker when available; the main-thread fallback gives identical results. */
function run<T>(job: LogoJob | FlowJob, transfer: Transferable[], fallback: () => T): Promise<T> {
  const target = getWorker();
  if (!target) return Promise.resolve().then(fallback);
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (value: never) => void, reject });
    target.postMessage({ ...job, id }, transfer);
  }).catch(() => fallback());
}

/** Buffers are copied before transfer so the fetch cache stays reusable. */
export function computeLogoArrays(buffers: ArrayBuffer[], count: number, haloCount: number, mobile: boolean) {
  const copies = buffers.map(buffer => buffer.slice(0));
  return run<LogoArrays>({ type: 'logo', buffers: copies, count, haloCount, mobile }, copies,
    () => buildLogoArrays(unpackParticles(buffers), count, haloCount, mobile, logoSvg));
}

export function computeLogoFlow(positions: Float32Array, kinds: Float32Array, seeds: Float32Array) {
  return run<Flow>({ type: 'flow', positions: positions.slice(), kinds: kinds.slice(), seeds: seeds.slice() }, [],
    () => createLogoFlow(positions, kinds, seeds, logoSvg));
}
