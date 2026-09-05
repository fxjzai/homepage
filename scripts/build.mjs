import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build, createServer } from 'vite';

await build();
const template = await readFile('dist/index.html', 'utf8');
for (const marker of ['<!--page-head-->', '<!--page-body-->']) {
  if (!template.includes(marker)) throw new Error(`Missing HTML marker: ${marker}`);
}

// Build-time rendering only: deployment needs no Node server or browser renderer.
const server = await createServer({
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null },
});
try {
  const { routes, site, renderPage } = await server.ssrLoadModule('/src/entry-server.tsx');
  for (const route of routes) {
    const { body, head } = await renderPage(route);
    const filename = route.path === '/' ? 'index.html' : `${route.path.slice(1)}.html`;
    const output = resolve('dist', filename);
    await mkdir(resolve(output, '..'), { recursive: true });
    await writeFile(output, template
      .replace('<!--page-head-->', () => head)
      .replace('<div id="root">', '<div id="root" data-prerendered="true">')
      .replace('<!--page-body-->', () => body));
    console.log(`Generated ${route.path} → ${filename}`);
  }
  const urls = routes.filter(route => route.indexable).map(route => `<url><loc>${site.origin}${route.path}</loc></url>`).join('\n');
  await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n`);
  const redirects = await readFile('public/_redirects', 'utf8');
  await writeFile('dist/_redirects', `${redirects}\n${routes.filter(route => route.path !== '/').map(route => `${route.path}/ ${route.path} 301`).join('\n')}\n`);
} finally {
  await server.close();
}
