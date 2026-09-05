import { useEffect, useState } from 'react';
import { ArrowIcon, Brand } from '../app/Brand';
import initialCommunity from '../../public/community.json';

type Community = { qrImage: string; qrUpdatedAt: string; contactLabel: string; contactValue: string; contactUrl: string };
const empty: Community = { qrImage: '', qrUpdatedAt: '', contactLabel: '', contactValue: '', contactUrl: '' };
const safeUrl = (url: string) => /^(https?:\/\/|mailto:|tel:|\/(?!\/))/.test(url) ? url : '';

export function JoinPage() {
  const [community, setCommunity] = useState<Community>(initialCommunity);
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/community.json', { cache: 'no-store', signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Config unavailable'); return response.json(); })
      .then(data => setCommunity(Object.fromEntries(Object.keys(empty).map(key => [key, typeof data[key] === 'string' ? data[key] : ''])) as Community))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const qr = safeUrl(community.qrImage);
  const qrUrl = qr ? `${qr}${qr.includes('?') ? '&' : '?'}v=${encodeURIComponent(community.qrUpdatedAt || '1')}` : '';
  const hasQr = !!qrUrl && !imageError;
  const copy = async () => {
    try { await navigator.clipboard.writeText(community.contactValue); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  };

  return <main className="join-page">
    <div className="space-underlay" aria-hidden="true" />
    <header className="site-header"><Brand /><a href="/" className="back-link"><span>返回首页</span><ArrowIcon /></a></header>
    <section className="join-content">
      <span className="section-kicker"><span className="red-line" />保持好奇，彼此连接</span>
      <h1>一起，<br />换个方向看世界<span className="title-period">.</span></h1>
      <p className="join-intro">加入反向加载社群，继续探索新的可能。</p>
      <div className={`qr-panel ${hasQr ? 'has-qr' : ''}`}>
        {hasQr ? <>
          <img className="community-qr" src={qrUrl} alt="反向加载社群二维码" onError={() => setImageError(true)} />
          <p>微信扫码加入 · 手机端可长按保存</p>
          <a href={qrUrl} download="反向加载社群二维码.png" className="save-qr">保存二维码<ArrowIcon /></a>
        </> : <div className="community-empty" role="status">
          <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M16 8H8v8m24-8h8v8M8 32v8h8m24-8v8h-8" stroke="currentColor" strokeWidth="1.4" /><circle cx="24" cy="24" r="2" fill="#ff3131" /></svg>
          <h2>{imageError ? '二维码暂时无法加载' : '社群入口即将开放'}</h2>
          <p>{community.contactValue ? '你也可以通过下方方式联系我们。' : '新的连接，值得一点等待。请稍后再来看看。'}</p>
        </div>}
      </div>
      {community.contactValue && <div className="backup-contact">
        <span>{community.contactLabel || '备用联系方式'}</span>
        <div>{safeUrl(community.contactUrl) ? <a href={safeUrl(community.contactUrl)}>{community.contactValue}</a> : <span className="contact-value">{community.contactValue}</span>}<button onClick={copy}>{copied ? '已复制' : '复制'}</button></div>
        {copyError && <p role="status">请长按或选中上方联系方式复制。</p>}
      </div>}
      <a href="/" className="return-experience">回到星群<ArrowIcon /></a>
    </section>
    <footer className="join-footer"><span>FXJZAI.COM</span><span>换一个方向，重新理解世界。</span></footer>
  </main>;
}
