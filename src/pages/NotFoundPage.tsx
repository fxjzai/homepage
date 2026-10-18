import { ArrowIcon, Brand } from '../app/Brand';
import { site } from '../content/site';

export default function NotFoundPage() {
  return <main className="join-page">
    <div className="space-underlay" aria-hidden="true" />
    <div className="subpage-stars" aria-hidden="true" />
    <header className="site-header"><Brand /><a href="/" className="back-link"><ArrowIcon diagonal={false} /><span>返回首页</span></a></header>
    <section className="join-content">
      <span className="section-kicker"><span className="red-line" />404</span>
      <h1>这个方向，<br />还没有页面<span className="title-period">.</span></h1>
      <p className="join-intro">链接可能有误，或页面已经移动。</p>
      <a className="return-experience" href="/"><ArrowIcon diagonal={false} />回到星群</a>
    </section>
    <footer className="join-footer"><span>{site.domainLabel}</span><span>换一个方向，重新理解世界。</span></footer>
  </main>;
}
