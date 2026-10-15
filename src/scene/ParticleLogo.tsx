import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, Group, MathUtils, Points, ShaderMaterial, Vector2 } from 'three';
import type { PointerField } from '../hooks/usePointerField';
import { createLogoGeometry } from '../lib/logoSampling';
import type { LogoArrays } from '../lib/logoArrays';
import { useParticleMotion } from './useParticleMotion';
import { particleMotionShader } from './shaders/particleMotion';
import { introShader } from './shaders/intro';
import { IgniteGlow } from './IgniteGlow';
import vertexShader from './shaders/particle.vert.glsl?raw';
import fragmentShader from './shaders/particle.frag.glsl?raw';
import type { SceneMetrics } from './sceneTypes';

export function ParticleLogo({ arrays, count, haloCount, paused, replay, epoch, pointer, mobile, onMetrics }: { arrays: LogoArrays; count: number; haloCount: number; paused: boolean; replay: number; epoch: number; pointer: RefObject<PointerField>; mobile: boolean; onMetrics?: (metrics: SceneMetrics) => void }) {
  const group = useRef<Group>(null);
  const material = useRef<ShaderMaterial>(null);
  const { gl, size, viewport, invalidate } = useThree();
  const time = useRef(0);
  const intro = useRef(0);
  const statistics = useRef({ elapsed: 0, frames: 0, total: 0 });
  const geometry = useMemo(() => createLogoGeometry(arrays), [arrays]);
  const points = useRef<Points<BufferGeometry, ShaderMaterial>>(null);
  const motionUniforms = useParticleMotion(geometry, points, pointer, paused, replay);
  const uniforms = useMemo(() => ({ ...motionUniforms, uTime: { value: 0 }, uIntro: { value: 0 }, uStill: { value: paused ? 1 : 0 }, uDpr: { value: 1 }, uScale: { value: 1 }, uHover: { value: new Vector2() }, uHoverStrength: { value: 0 } }), [motionUniforms]);
  const offset = mobile ? viewport.height * .078 : viewport.height * .035;
  // 63% of the short side, rising to 79% on narrow screens.
  const scale = Math.min(viewport.width, viewport.height) * (mobile ? .395 : .315);
  useEffect(() => {
    intro.current = Math.max(0, (performance.now() - epoch) / 1000);
    invalidate();
  }, [replay, epoch, invalidate]);
  useEffect(() => {
    const values = material.current?.uniforms ?? uniforms;
    values.uStill.value = paused ? 1 : 0;
    if (paused) {
      intro.current = Math.max(intro.current, 7);
      pointer.current.dragX = pointer.current.dragY = 0;
      pointer.current.velocityX = pointer.current.velocityY = 0;
    }
    invalidate();
  }, [paused, uniforms, invalidate, pointer]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, .05);
    if (!group.current || !material.current) return;
    const values = material.current.uniforms;
    const state = pointer.current;
    const damp = 1 - Math.exp(-delta * 5.6);
    values.uDpr.value = gl.getPixelRatio();
    values.uScale.value = Math.max(.8, Math.min(1.3, Math.min(size.width, size.height) / 850));
    const hovering = state.active && !state.dragging && !paused ? 1 : 0;
    values.uHover.value.set(state.x * size.width / Math.max(1, size.height), state.y);
    values.uHoverStrength.value += (hovering - values.uHoverStrength.value) * (1 - Math.exp(-delta * 6));
    if (paused) {
      group.current.rotation.set(0, 0, 0);
      values.uIntro.value = 7; values.uTime.value = time.current;
      return;
    }
    time.current += delta; intro.current += Math.min(rawDelta, 1);
    values.uTime.value = time.current; values.uIntro.value = intro.current;
    if (!state.dragging) {
      state.dragX = MathUtils.clamp((state.dragX + state.velocityX * delta) * Math.exp(-delta * 1.4), -.42, .42);
      state.dragY = MathUtils.clamp((state.dragY + state.velocityY * delta) * Math.exp(-delta * 1.4), -.65, .65);
      state.velocityX *= Math.exp(-delta * 5); state.velocityY *= Math.exp(-delta * 5);
    }
    const targetX = state.dragX;
    const targetY = state.dragY;
    group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, targetX, damp);
    group.current.rotation.y = MathUtils.lerp(group.current.rotation.y, targetY, damp);
    group.current.updateMatrixWorld();
    const stats = statistics.current;
    stats.elapsed += rawDelta; stats.frames++; stats.total++;
    if (onMetrics && stats.elapsed >= .75) {
      onMetrics({ renderer: 'WebGL', fps: Math.round(stats.frames / stats.elapsed), particles: count + haloCount, frame: stats.total, rotation: group.current.rotation.y, intro: intro.current });
      stats.elapsed = 0; stats.frames = 0;
    }
  }, -2);

  return <group ref={group} position={[0, offset, 0]} scale={scale}>
    <IgniteGlow material={material} />
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={particleMotionShader + introShader + vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  </group>;
}
