import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { loadPage } from './app/App';
import { resolveRoute } from './app/routes';
import { prefetchNavigation } from './app/navigation';
import './styles/global.css';

const root = document.getElementById('root')!;
const route = resolveRoute(window.location.pathname);

// Home only: start the WebGL scene chunks alongside the page module instead of after it. The particle data
// is already preloaded from the HTML; this call adopts that response (or fetches it if preload is unsupported).
// Plain dynamic imports, so /join and 404 never request Three.js.
if (route.id === 'home' && new URLSearchParams(location.search).get('renderer') !== 'canvas') {
  import('./scene/ParticleLogoScene').catch(() => {});
  import('./lib/logoTargets').then(({ prefetchLogoTargets }) => prefetchLogoTargets()).catch(() => {});
}

loadPage(route.id).then(Page => {
  const app = <React.StrictMode><Page /></React.StrictMode>;
  if (root.dataset.prerendered === 'true') hydrateRoot(root, app);
  else { document.title = route.title; createRoot(root).render(app); }
  prefetchNavigation();
}).catch(error => {
  // 模块加载失败时保留已生成的正文与普通链接。
  document.documentElement.classList.add('app-unavailable');
  console.error('Page could not start:', error);
});
