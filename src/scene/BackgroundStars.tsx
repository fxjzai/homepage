import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, ShaderMaterial } from 'three';
import { createStarGeometry } from '../lib/logoSampling';

const vertexShader = `
  uniform float uTime; uniform float uDpr;
  attribute float aSize; attribute float aPhase; attribute vec3 color;
  varying vec3 vColor; varying float vAlpha;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uDpr * (6.0 / -mvPosition.z);
    vColor = color;
    vAlpha = .42 + .22 * sin(uTime * .17 + aPhase);
  }
`;
const fragmentShader = `
  varying vec3 vColor; varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - .5) * 2.0;
    if (r > 1.0) discard;
    gl_FragColor = vec4(vColor, exp(-r*r*5.0) * vAlpha);
  }
`;

export function BackgroundStars({ paused, mobile }: { paused: boolean; mobile: boolean }) {
  const geometry = useMemo(() => createStarGeometry(mobile ? 600 : 1800), [mobile]);
  const material = useRef<ShaderMaterial>(null);
  const gl = useThree(state => state.gl);
  const uniforms = useMemo(() => ({ uTime: { value: 8 }, uDpr: { value: 1 } }), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_state, delta) => {
    if (!material.current) return;
    uniforms.uDpr.value = gl.getPixelRatio();
    if (!paused) uniforms.uTime.value += Math.min(delta, .05);
  });
  return <points geometry={geometry} frustumCulled={false}>
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false} blending={AdditiveBlending} />
  </points>;
}
