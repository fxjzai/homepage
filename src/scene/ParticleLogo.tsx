import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, Group, MathUtils, Plane, Raycaster, ShaderMaterial, Vector2, Vector3, Vector4 } from 'three';
import type { PointerField } from '../hooks/usePointerField';
import { createLogoGeometry } from '../lib/logoSampling';
import vertexShader from './shaders/particle.vert.glsl?raw';
import fragmentShader from './shaders/particle.frag.glsl?raw';
import type { SceneMetrics } from './sceneTypes';

export function ParticleLogo({ data, count, paused, replay, epoch, pointer, mobile, onMetrics }: { data: Float32Array; count: number; paused: boolean; replay: number; epoch: number; pointer: RefObject<PointerField>; mobile: boolean; onMetrics?: (metrics: SceneMetrics) => void }) {
  const group = useRef<Group>(null);
  const material = useRef<ShaderMaterial>(null);
  const { gl, camera, size, viewport, invalidate } = useThree();
  const time = useRef(0);
  const intro = useRef(0);
  const trailClock = useRef(0);
  const trailIndex = useRef(0);
  const statistics = useRef({ elapsed: 0, frames: 0, total: 0 });
  const geometry = useMemo(() => createLogoGeometry(data, count), [data, count]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uIntro: { value: 0 }, uStill: { value: paused ? 1 : 0 }, uDpr: { value: 1 }, uScale: { value: 1 }, uPointer: { value: new Vector3(100, 100, 0) }, uPointerStrength: { value: 0 }, uTrail: { value: Array.from({ length: 8 }, () => new Vector4(100, 100, 0, -100)) } }), []);
  const ray = useMemo(() => new Raycaster(), []);
  const plane = useMemo(() => new Plane(), []);
  const normal = useMemo(() => new Vector3(), []);
  const point = useMemo(() => new Vector3(), []);
  const pointerXY = useMemo(() => new Vector2(), []);
  const offset = mobile ? viewport.height * .078 : viewport.height * .035;
  // 63% of the short side, rising to 79% on narrow screens.
  const scale = Math.min(viewport.width, viewport.height) * (mobile ? .395 : .315);
  useEffect(() => { intro.current = Math.max(0, (performance.now() - epoch) / 1000); invalidate(); }, [replay, epoch, invalidate]);
  useEffect(() => {
    const values = material.current?.uniforms ?? uniforms;
    values.uStill.value = paused ? 1 : 0;
    if (paused) {
      intro.current = Math.max(intro.current, 7);
      values.uTrail.value.forEach((sample: Vector4) => sample.set(100, 100, 0, -100));
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
    if (paused) {
      group.current.rotation.set(0, 0, 0); values.uPointerStrength.value = 0;
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
    const targetX = (state.active ? -state.y * .14 : 0) + state.dragX + Math.sin(time.current * .22) * .025;
    const targetY = (state.active ? state.x * .25 : 0) + state.dragY + Math.sin(time.current * .17) * .045;
    group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, targetX, damp);
    group.current.rotation.y = MathUtils.lerp(group.current.rotation.y, targetY, damp);
    group.current.updateMatrixWorld();
    if (state.active) {
      pointerXY.set(state.x, state.y);
      ray.setFromCamera(pointerXY, camera);
      normal.set(0, 0, 1).applyQuaternion(group.current.quaternion);
      plane.setFromNormalAndCoplanarPoint(normal, group.current.position);
      if (ray.ray.intersectPlane(plane, point)) {
        group.current.worldToLocal(point);
        // Field position and strength both use frame-rate-independent damping.
        if (values.uPointerStrength.value < .002) values.uPointer.value.copy(point);
        else values.uPointer.value.lerp(point, 1 - Math.exp(-delta * 12));
        if (time.current - trailClock.current > .09) {
          values.uTrail.value[trailIndex.current].set(point.x, point.y, point.z, time.current);
          trailIndex.current = (trailIndex.current + 1) % 8;
          trailClock.current = time.current;
        }
      }
    }
    const pointerResponse = state.active ? 8.0 : 2.2;
    values.uPointerStrength.value = MathUtils.lerp(values.uPointerStrength.value, state.active ? 1 : 0, 1 - Math.exp(-delta * pointerResponse));
    const stats = statistics.current;
    stats.elapsed += rawDelta; stats.frames++; stats.total++;
    if (onMetrics && stats.elapsed >= .75) {
      onMetrics({ renderer: 'WebGL', fps: Math.round(stats.frames / stats.elapsed), particles: count, frame: stats.total, rotation: group.current.rotation.y, intro: intro.current });
      stats.elapsed = 0; stats.frames = 0;
    }
  });

  return <group ref={group} position={[0, offset, 0]} scale={scale}>
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  </group>;
}
