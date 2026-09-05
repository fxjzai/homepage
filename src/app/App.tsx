import type { ComponentType } from 'react';
import type { RouteId } from './routes';

// 每页独立加载。新增轻量产品只需增加路由元信息和对应加载器。
const pages: Record<RouteId, () => Promise<{ default: ComponentType }>> = {
  home: () => import('../pages/HomePage'),
  join: () => import('../pages/JoinPage').then(module => ({ default: module.JoinPage })),
  notFound: () => import('../pages/NotFoundPage'),
};

export async function loadPage(id: RouteId) {
  return (await pages[id]()).default;
}
