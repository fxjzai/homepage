import { routes } from './routes';

export function prefetchNavigation() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? '')) return;
  const prefetched = new Set<string>();
  const prefetch = (event: Event) => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (!link || link.hasAttribute('download') || link.target === '_blank') return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || url.search || !routes.some(route => route.indexable && route.path === url.pathname) || prefetched.has(url.pathname)) return;
    prefetched.add(url.pathname);
    const hint = document.createElement('link');
    hint.rel = 'prefetch'; hint.href = url.pathname; hint.as = 'document';
    document.head.append(hint);
  };
  // 只预取 HTML，不提前启动目标页的粒子和其他交互代码。
  document.addEventListener('pointerover', prefetch, { passive: true });
  document.addEventListener('focusin', prefetch);
}
