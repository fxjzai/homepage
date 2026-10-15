import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { NoToneMapping } from 'three';
import { usePointerField } from '../hooks/usePointerField';
import { useAdaptiveQuality } from '../hooks/useAdaptiveQuality';
import { loadLogoBuffers } from '../lib/logoTargets';
import { computeLogoArrays } from '../lib/logoWorkerClient';
import type { LogoArrays } from '../lib/logoArrays';
import { particleBudget } from '../lib/particleBudget';
import { ParticleLogo } from './ParticleLogo';
import { BackgroundStars } from './BackgroundStars';
import type { SceneProps } from './sceneTypes';

function SceneLifecycle({ active, onReady, onError }: { active: boolean; onReady: () => void; onError: () => void }) {
  const { gl, invalidate } = useThree();
  const ready = useRef(false);
  useAdaptiveQuality(active);
  useEffect(() => {
    const canvas = gl.domElement;
    gl.debug.onShaderError = () => { if (import.meta.env.DEV) console.error('Particle shader compilation failed'); onError(); };
    const lost = (event: Event) => { event.preventDefault(); if (import.meta.env.DEV) console.warn('Particle renderer context lost'); onError(); };
    canvas.addEventListener('webglcontextlost', lost);
    invalidate();
    return () => { canvas.removeEventListener('webglcontextlost', lost); gl.debug.onShaderError = null; };
  }, [gl, invalidate, onReady, onError]);
  useEffect(() => { invalidate(); }, [active, invalidate]);
  useFrame(() => {
    if (ready.current) return;
    if (gl.info.render.calls > 0) { ready.current = true; onReady(); }
    else invalidate();
  });
  return null;
}

export default function ParticleLogoScene({ paused, visible, replay, epoch, onReady, onError, onReplay, onMetrics }: SceneProps) {
  const container = useRef<HTMLDivElement>(null);
  const pointer = usePointerField(container, paused, onReplay);
  const [budget, setBudget] = useState(particleBudget);
  // Keeps the previous tier on screen until the new one is ready, so a resize never blanks the scene.
  const [logo, setLogo] = useState<{ arrays: LogoArrays; count: number; haloCount: number; mobile: boolean } | null>(null);
  const { mobile, count, haloCount } = budget;
  useEffect(() => {
    try {
      const probe = document.createElement('canvas');
      const context = probe.getContext('webgl2');
      if (!context) { if (import.meta.env.DEV) console.warn('WebGL 2 is not supported by this browser'); onError(); return; }
      const motionSupported = context.getExtension('EXT_color_buffer_float') || context.getExtension('EXT_color_buffer_half_float');
      context.getExtension('WEBGL_lose_context')?.loseContext();
      if (!motionSupported) { onError(); return; }
    } catch (error) { if (import.meta.env.DEV) console.warn('WebGL preflight failed:', error); onError(); }
  }, [onError]);
  useEffect(() => {
    let mounted = true;
    // Decode and trace flow paths in a worker; the Canvas 2D intro keeps animating meanwhile.
    loadLogoBuffers(count).then(buffers => computeLogoArrays(buffers, count, haloCount, mobile))
      .then(arrays => { if (mounted) setLogo({ arrays, count, haloCount, mobile }); })
      .catch(error => { if (import.meta.env.DEV) console.error('Logo targets unavailable:', error); if (mounted) onError(); });
    return () => { mounted = false; };
  }, [count, haloCount, mobile, onError]);
  useEffect(() => {
    const mq = matchMedia('(max-width: 600px)');
    const update = () => setBudget(particleBudget());
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return <div ref={container} className="scene-container" role="img" aria-label="白色星粒组成反向加载 Logo 外圈，红色星粒组成中央斜杠。可移动指针探索，拖动旋转。">
    {logo && <Canvas camera={{ position: [0, 0, 4.8], fov: 38, near: .1, far: 50 }}
      dpr={[.75, mobile ? 1.15 : 1.5]} frameloop={visible && !paused ? 'always' : 'demand'}
      gl={{ alpha: true, antialias: false, powerPreference: 'high-performance', toneMapping: NoToneMapping }}>
      <SceneLifecycle active={visible && !paused} onReady={onReady} onError={onError} />
      <BackgroundStars paused={paused} mobile={mobile} pointer={pointer} replay={replay} />
      <ParticleLogo arrays={logo.arrays} count={logo.count} haloCount={logo.haloCount} paused={paused} replay={replay} epoch={epoch} pointer={pointer} mobile={logo.mobile} onMetrics={onMetrics} />
    </Canvas>}
  </div>;
}
