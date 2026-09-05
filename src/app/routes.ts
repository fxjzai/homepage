import { site } from '../content/site.ts';

export const routes = [
  { id: 'home', path: '/', title: '反向加载 · 探索无终点', description: site.description, indexable: true },
  { id: 'join', path: '/join', title: '加入社群 · 反向加载', description: '加入反向加载社群，继续探索新的可能。查看社群二维码和备用联系方式。', indexable: true },
  { id: 'notFound', path: '/404', title: '页面未找到 · 反向加载', description: '这个页面不存在，你可以返回反向加载首页。', indexable: false },
] as const;

export type Route = typeof routes[number];
export type RouteId = Route['id'];

export function resolveRoute(pathname: string): Route {
  if (pathname.includes('//')) return routes[2];
  const path = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
  return routes.find(route => route.path === path) ?? routes[2];
}
