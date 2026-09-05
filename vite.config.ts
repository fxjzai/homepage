import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { routes } from './src/app/routes';

export default defineConfig({
  appType: 'mpa',
  plugins: [react(), {
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
