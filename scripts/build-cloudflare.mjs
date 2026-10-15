import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import config from '../cloudflare.config.ts';

const root = new URL('../', import.meta.url);
// cf's v0 Build Output layout, as implemented by @cloudflare/build-output-utils.
// Keep the normal Vite + prerender build: cf's automatic Vite build skips our SSR step.
const output = new URL('.cloudflare/output/', root);
const worker = new URL('v0/workers/default/', output);
const html = await readFile(new URL('dist/index.html', root), 'utf8');
if (!html.includes('data-prerendered="true"')) {
  throw new Error('Run npm run build before preparing the Cloudflare deployment.');
}
for (const page of ['join.html', '404.html']) {
  await readFile(new URL(`dist/${page}`, root));
}
await rm(output, { recursive: true, force: true });
await mkdir(worker, { recursive: true });
await cp(new URL('dist/', root), new URL('assets/', worker), { recursive: true });
await writeFile(new URL('worker.config.json', worker), JSON.stringify(config.worker, null, 2));
await writeFile(new URL('v0/config.json', output), JSON.stringify({
  buildContext: { isPreview: false, mode: 'production' },
}, null, 2));
console.log(`Prepared static Workers output: ${fileURLToPath(output)}`);
