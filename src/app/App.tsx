import { lazy, Suspense } from 'react';
import { JoinPage } from '../pages/JoinPage';

const HomePage = lazy(() => import('../pages/HomePage'));

export function App() {
  const isJoin = /^\/join\/?$/.test(window.location.pathname);
  return isJoin ? <JoinPage /> : <Suspense fallback={<div className="boot-surface" />}><HomePage /></Suspense>;
}
