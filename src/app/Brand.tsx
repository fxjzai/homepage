import { site } from '../content/site';

export function Brand() {
  return <a href="/" className="brand" aria-label="反向加载首页">
    <img src="/assets/brand-mark.svg" alt="" width="30" height="34" />
    <span className="brand-name">{site.name}<span className="brand-english">{site.englishName}</span></span>
  </a>;
}

export function ArrowIcon({ diagonal = true }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M5 12h14m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
