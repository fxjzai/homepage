import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

export function useAdaptiveQuality(active: boolean) {
  const { setDpr, gl } = useThree();
  const sample = useRef({ elapsed: 0, frames: 0, warmup: 0, reductions: 0, below: 0 });
  useFrame((_state, delta) => {
    if (!active) return;
    const s = sample.current;
    s.warmup += delta;
    if (s.warmup < 5) return;
    s.elapsed += delta; s.frames++;
    if (s.elapsed < 2) return;
    const fps = s.frames / s.elapsed;
    s.below = fps < 45 ? s.below + 1 : 0;
    if (s.below >= 2 && s.reductions < 2) {
      setDpr(Math.max(.75, gl.getPixelRatio() * .8));
      s.reductions++; s.below = 0;
    }
    s.elapsed = 0; s.frames = 0;
  });
}
