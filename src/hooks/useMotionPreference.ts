import { useEffect, useState } from 'react';

export function useMotionPreference() {
  const [systemReduced, setSystemReduced] = useState(false);
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('fxjzai-motion-paused');
      setUserPaused(stored === null ? null : stored === 'true');
    } catch { /* Storage is optional. */ }
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReduced(mq.matches);
    const change = () => setSystemReduced(mq.matches);
    mq.addEventListener('change', change);
    return () => mq.removeEventListener('change', change);
  }, []);
  const setPaused = (paused: boolean) => {
    setUserPaused(paused);
    try { localStorage.setItem('fxjzai-motion-paused', String(paused)); } catch { /* preference remains in memory */ }
  };
  return { paused: userPaused ?? systemReduced, systemReduced, setPaused };
}
