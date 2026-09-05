import { Brand } from '../app/Brand';
import { site } from '../content/site';

export default function NotFoundPage() {
  return <main className="join-page">
    <div className="space-underlay" aria-hidden="true" />
    <header className="site-header"><Brand /></header>
    <section className="join-content">
      <span className="section-kicker">404</span>
      <h1>这个方向，<br />还没有页面<span className="title-period">.</span></h1>
      <p className="join-intro">链接可能有误，或页面已经移动。</p>
      <a className="return-experience" href="/">返回首页</a>
    </section>
    <footer className="join-footer"><span>{site.domainLabel}</span></footer>
  </main>;
}
