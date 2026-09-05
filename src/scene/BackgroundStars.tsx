import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, Points, ShaderMaterial } from 'three';
import { createStarGeometry } from '../lib/logoSampling';
import type { PointerField } from '../hooks/usePointerField';
import { useParticleMotion } from './useParticleMotion';
import { particleMotionShader } from './shaders/particleMotion';

const vertexShader = `
  uniform float uTime; uniform float uDpr;
  attribute float aSize; attribute float aPhase; attribute vec3 color;
  varying vec3 vColor; varying float vAlpha;
  void main() {
    vec3 point = position;
    vec4 mvPosition = modelViewMatrix * vec4(point, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = max(1.0, aSize * uDpr * (8.0 / -mvPosition.z));
    vColor = color;
    vAlpha = .55 + .14 * sin(uTime * .3 + aPhase);
    applyParticleMotion(gl_Position);
  }
`;
const fragmentShader = `
  varying vec3 vColor; varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - .5) * 2.0;
    if (r > 1.0) discard;
    gl_FragColor = vec4(vColor, (exp(-r*r*14.0) + .32 * exp(-r*r*3.0)) * vAlpha);
  }
`;

export function BackgroundStars({ paused, mobile, pointer, replay }: { paused: boolean; mobile: boolean; pointer: RefObject<PointerField>; replay: number }) {
  const size = useThree(state => state.size);
  const aspect = size.width / Math.max(1, size.height);
  const geometry = useMemo(() => createStarGeometry(mobile ? 750 : 2200, aspect), [mobile, aspect]);
  const points = useRef<Points<BufferGeometry, ShaderMaterial>>(null);
  const motionUniforms = useParticleMotion(geometry, points, pointer, paused, replay);
  const material = useRef<ShaderMaterial>(null);
  const gl = useThree(state => state.gl);
  const uniforms = useMemo(() => ({ ...motionUniforms, uTime: { value: 8 }, uDpr: { value: 1 } }), [motionUniforms]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_state, delta) => {
    if (!material.current) return;
    const values = material.current.uniforms;
    values.uDpr.value = gl.getPixelRatio();
    if (!paused) values.uTime.value += Math.min(delta, .05);
  }, -2);
  return <points ref={points} geometry={geometry} frustumCulled={false}>
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={particleMotionShader + vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false} blending={AdditiveBlending} />
  </points>;
}
