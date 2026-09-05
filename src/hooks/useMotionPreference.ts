import { useEffect, useState } from 'react';

export function useMotionPreference() {
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [userPaused, setUserPaused] = useState<boolean | null>(() => {
    try {
      const stored = localStorage.getItem('fxjzai-motion-paused');
      return stored === null ? null : stored === 'true';
    } catch { return null; }
  });
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
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
