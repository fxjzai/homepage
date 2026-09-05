import { site } from '../content/site.ts';
import type { Route } from './routes.ts';

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export function pageHead(route: Route) {
  const url = new URL(route.path, site.origin).href;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: route.title,
    description: route.description,
    url,
    inLanguage: 'zh-CN',
    isPartOf: { '@type': 'WebSite', '@id': `${site.origin}/#website`, name: site.name, url: `${site.origin}/` },
  };
  return `<title>${escapeHtml(route.title)}</title>
    <meta name="description" content="${escapeHtml(route.description)}" />
    <meta name="robots" content="${route.indexable ? 'index,follow' : 'noindex,follow'}" />
    ${route.indexable ? `<link rel="canonical" href="${escapeHtml(url)}" />` : ''}
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(site.name)}" />
    <meta property="og:locale" content="zh_CN" />
    <meta property="og:title" content="${escapeHtml(route.title)}" />
    <meta property="og:description" content="${escapeHtml(route.description)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta name="twitter:card" content="summary" />
    ${route.indexable ? `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>` : ''}`;
}
