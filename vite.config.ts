import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { routes } from './src/app/routes';
import { LOGO_PARTS, packParticles } from './src/lib/logoPack';

// Packs the float32 source asset into compact, content-hashed parts at build time.
// Dev serves the same bytes from memory; the source .bin stays the single source of truth.
function logoPack(): Plugin {
  const id = 'virtual:logo-pack', resolved = '\0' + id;
  let command = 'serve';
  const parts = async () => {
    const buffer = await readFile(resolve('public/assets/logo-particles.bin'));
    const source = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
    return LOGO_PARTS.map(([start, end]) => packParticles(source, start, end));
  };
  return {
    name: 'logo-pack',
    configResolved(config) { command = config.command; },
    resolveId(source) { return source === id ? resolved : undefined; },
    async load(source) {
      if (source !== resolved) return;
      this.addWatchFile(resolve('public/assets/logo-particles.bin'));
      if (command === 'serve') return `export default ${JSON.stringify(LOGO_PARTS.map((_, i) => `/@logo-pack/${i}.bin`))};`;
      const urls = (await parts()).map((bytes, i) => `import.meta.ROLLUP_FILE_URL_${this.emitFile({ type: 'asset', name: `logo-part-${i}.bin`, source: bytes })}`);
      return `export default [${urls.join(', ')}];`;
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const match = request.url?.match(/^\/@logo-pack\/(\d+)\.bin/);
        if (!match) { next(); return; }
        const bytes = (await parts())[Number(match[1])];
        if (!bytes) { next(); return; }
        response.setHeader('Content-Type', 'application/octet-stream');
        response.end(Buffer.from(bytes));
      });
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [react(), logoPack(), {
    name: 'static-page-routes',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost');
        if (routes.some(route => route.path !== '/' && route.path === url.pathname.replace(/\/$/, ''))) request.url = `/index.html${url.search}`;
        next();
      });
    },
    configurePreviewServer(server) {
      return () => server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost');
        const route = routes.find(route => route.path === url.pathname.replace(/\/$/, ''));
        if (url.pathname !== '/' && url.pathname.endsWith('/') && route) {
          response.writeHead(301, { Location: `${route.path}${url.search}` });
          response.end();
          return;
        }
        if (url.pathname === '/' || route || url.pathname.includes('.')) { next(); return; }
        try {
          const html = await readFile(resolve(server.config.root, server.config.build.outDir, '404.html'), 'utf8');
          response.statusCode = 404;
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.end(html);
        } catch { next(); }
      });
    },
  }],
  server: { allowedHosts: ['terminal.local'], host: '0.0.0.0', port: 4173 },
  build: {
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three';
          if (id.includes('/node_modules/@react-three/fiber/')) return 'fiber';
        }
      }
    }
  }
});
