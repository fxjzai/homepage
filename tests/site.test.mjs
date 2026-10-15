import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { routes, resolveRoute } from '../src/app/routes.ts';
import { pageHead } from '../src/app/metadata.ts';

test('unknown paths are not treated as the homepage', () => {
  assert.equal(resolveRoute('/').id, 'home');
  assert.equal(resolveRoute('/join').id, 'join');
  assert.equal(resolveRoute('/join/').id, 'join');
  for (const path of ['/missing', '/join/missing', '/ai-history', '//']) {
    assert.equal(resolveRoute(path).id, 'notFound', path);
  }
});

test('metadata escapes text and cannot terminate its JSON-LD script', () => {
  const head = pageHead({ ...routes[0], title: '</script><script>alert("x")</script>' });
  assert.ok(!head.includes('<script>alert'));
  const json = head.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1];
  assert.equal(JSON.parse(json).name, '</script><script>alert("x")</script>');
  assert.match(pageHead(routes[2]), /noindex,follow/);
  assert.ok(!pageHead(routes[2]).includes('rel="canonical"'));
});

test('production pages expose real content and per-page metadata without JavaScript', () => {
  const home = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const join = readFileSync(new URL('../dist/join.html', import.meta.url), 'utf8');
  const missing = readFileSync(new URL('../dist/404.html', import.meta.url), 'utf8');
  assert.match(home, /<h1>反向加载/);
  assert.match(home, /探索无终点/);
  assert.match(home, /href="\/join"/);
  assert.match(home, /href="https:\/\/ic\.fxjzai\.com\/"/);
  assert.match(home, /科技资讯/);
  assert.match(home, /rel="canonical" href="https:\/\/fxjzai.com\/"/);
  assert.match(join, /<title>加入社群 · 反向加载<\/title>/);
  assert.match(join, /社群入口即将开放/);
  assert.match(join, /rel="canonical" href="https:\/\/fxjzai.com\/join"/);
  assert.match(missing, /noindex,follow/);
  for (const html of [home, join, missing]) {
    assert.match(html, /data-prerendered="true"/);
    assert.ok(!html.includes('<!--page-'));
    assert.ok(!html.includes('modulepreload" crossorigin href="/assets/three-'));
  }
  const sitemap = readFileSync(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
  assert.match(sitemap, /https:\/\/fxjzai.com\/join/);
  assert.ok(!sitemap.includes('/404'));
  assert.ok(!readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8').includes('/* /index.html 200'));
});


test('published release identifier matches homepage diagnostics and has release notes', () => {
  const release = JSON.parse(readFileSync(new URL('../public/release.json', import.meta.url), 'utf8'));
  const page = readFileSync(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8');
  const notes = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  assert.ok(page.includes(`版本 ${release.release}`));
  assert.ok(notes.includes(release.release));
  assert.ok(release.change.includes('科技资讯'));
});


test('Cloudflare deployment preserves prerendered routes, assets and real 404 handling', () => {
  const base = new URL('../.cloudflare/output/v0/', import.meta.url);
  const root = JSON.parse(readFileSync(new URL('config.json', base), 'utf8'));
  const worker = JSON.parse(readFileSync(new URL('workers/default/worker.config.json', base), 'utf8'));
  assert.deepEqual(root.buildContext, { isPreview: false, mode: 'production' });
  assert.equal(worker.name, 'fxjzai-homepage');
  assert.deepEqual(worker.domains, ['fxjzai.com']);
  assert.equal(worker.assets.htmlHandling, 'drop-trailing-slash');
  assert.equal(worker.assets.notFoundHandling, '404-page');
  assert.ok(!worker.entrypoint);
  for (const file of ['index.html', 'join.html', '404.html', 'release.json', '_headers', '_redirects', 'assets/brand-mark.svg']) {
    assert.deepEqual(readFileSync(new URL(`workers/default/assets/${file}`, base)), readFileSync(new URL(`../dist/${file}`, import.meta.url)));
  }
});
