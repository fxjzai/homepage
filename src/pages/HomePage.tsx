import { Component, lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowIcon, Brand } from '../app/Brand';
import { useMotionPreference } from '../hooks/useMotionPreference';
import CanvasParticleScene from '../scene/CanvasParticleScene';
import type { SceneMetrics } from '../scene/sceneTypes';
import { homeContent, site } from '../content/site';

const ParticleLogoScene = lazy(() => import('../scene/ParticleLogoScene'));

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { if (import.meta.env.DEV) console.error('Particle scene unavailable:', error); this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const { paused, systemReduced, setPaused } = useMotionPreference();
  const [replay, setReplay] = useState(0);
  const [ready, setReady] = useState(false);
  const [backend, setBackend] = useState<'auto' | 'webgl' | 'canvas' | 'static'>('auto');
  const [epoch, setEpoch] = useState(0);
  const [metrics, setMetrics] = useState<SceneMetrics | null>(null);
  const [copyVisible, setCopyVisible] = useState(paused);
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setBackend(params.get('renderer') === 'canvas' ? 'canvas' : 'auto');
    setDebug(params.has('debug'));
    setEpoch(performance.now());
    setMounted(true);
  }, []);
  const failed = backend === 'static';
  useEffect(() => {
    if (paused || failed) { setCopyVisible(true); return; }
    if (!ready || copyVisible) return;
    const timeout = window.setTimeout(() => setCopyVisible(true), 3400);
    return () => window.clearTimeout(timeout);
  }, [paused, failed, ready, copyVisible]);
  const [visible, setVisible] = useState(true);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setBackend('canvas'), []);
  const onCanvasError = useCallback(() => { setBackend('static'); setReady(true); }, []);
  const onWebGLReady = useCallback(() => { setReady(true); setBackend(current => current === 'auto' ? 'webgl' : current); }, []);
  useEffect(() => {
    if (backend !== 'auto') return;
    const timeout = window.setTimeout(() => setBackend('canvas'), 7000);
    return () => window.clearTimeout(timeout);
  }, [backend]);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  const replayAnimation = () => { if (!paused) { setEpoch(performance.now()); setReplay(value => value + 1); } };
  const toggleMotion = () => {
    if (!paused) setEpoch(performance.now() - 7000);
    setPaused(!paused);
  };

  return <main className={`home ${ready ? 'scene-ready' : ''} ${paused || failed ? 'is-still' : ''}`}>
    <div className="space-underlay" aria-hidden="true" />
    <div className={`static-scene ${ready && !failed ? 'is-hidden' : ''}`} aria-hidden="true">
      <img src="/assets/logo-particles.svg" alt="" />
    </div>
    {mounted && backend !== 'webgl' && !failed && <SceneBoundary onError={onCanvasError}>
      <CanvasParticleScene paused={paused} visible={visible} replay={replay} epoch={epoch} onReady={onReady} onError={onCanvasError} onReplay={replayAnimation} onMetrics={debug ? setMetrics : undefined} />
    </SceneBoundary>}
    {mounted && (backend === 'auto' || backend === 'webgl') && <div className={`webgl-layer ${backend === 'webgl' ? 'is-active' : ''}`}><SceneBoundary onError={onError}>
      <Suspense fallback={null}>
        <ParticleLogoScene paused={paused} visible={visible} replay={replay} epoch={epoch} onReady={onWebGLReady} onError={onError} onReplay={replayAnimation} onMetrics={debug ? setMetrics : undefined} />
      </Suspense>
    </SceneBoundary></div>}
    {debug && <output className="scene-diagnostics" aria-label="粒子渲染诊断">版本 2026-10-15-brand-navigation-1<br />路径 {backend} · {paused ? '已暂停' : '动态开启'}{systemReduced ? ' · 系统减少动态' : ''}{metrics && <><br />{metrics.renderer} · {metrics.particles} 粒子 · {metrics.fps} FPS<br />帧 {metrics.frame} · 旋转 {metrics.rotation.toFixed(3)} · 动画 {metrics.intro.toFixed(2)}s{metrics.paintMs !== undefined && <><br />绘制 {metrics.paintMs.toFixed(1)}ms</>}</>}</output>}

    <header className="site-header">
      <Brand />
      <nav className="header-links" aria-label="品牌入口">
        <a className="news-link" href={homeContent.news.href}>{homeContent.news.label}<ArrowIcon /></a>
        <a className="community-link" href={homeContent.action.href}><span>{homeContent.action.label}</span><span className="arrow-circle"><ArrowIcon /></span></a>
      </nav>
    </header>

    <section className={`hero-copy ${copyVisible ? 'copy-visible' : ''}`} aria-label="品牌介绍">
      <div className="copy-overline"><span className="red-line" />{homeContent.overline}</div>
      <h1>{homeContent.title}<span className="title-period">.</span></h1>
    </section>

    <div className="orbit-caption" aria-hidden="true"><span>{homeContent.caption}</span><span className="caption-line" /></div>

    <footer className="site-footer">
      <span className="footer-domain">{site.domainLabel}</span>
      {!paused && !failed && <p className="interaction-hint"><svg viewBox="0 0 20 24" fill="none" aria-hidden="true"><rect x="4.5" y="2.5" width="11" height="17" rx="5.5" stroke="currentColor" /><path d="M10 6v4" stroke="currentColor" strokeLinecap="round" /></svg><span className="desktop-hint">移动探索 · 拖动旋转</span><span className="mobile-hint">轻触探索 · 拖动旋转</span></p>}
      <div className="motion-controls">
        <button className="icon-button replay-button" onClick={replayAnimation} disabled={paused || failed} aria-label="重播聚合动画" title="重播聚合动画"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10a8 8 0 1 1 .9 6M4 4v6h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        <span className="controls-divider" />
        <button className="motion-button" onClick={toggleMotion} disabled={failed} aria-pressed={paused || failed} aria-label={failed ? '静态展示模式' : paused ? '开启动态效果' : '关闭动态效果'} title={systemReduced && paused ? '已遵循系统减少动态效果设置，点击可开启本页动画' : undefined}>
          {paused || failed ? <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7 4 8 6-8 6V4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg> : <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 5v10M13 5v10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>}
          <span>{paused || failed ? '静态模式' : '动态已开启'}</span>
        </button>
      </div>
    </footer>
  </main>;
}
