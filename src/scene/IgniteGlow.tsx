import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { CustomBlending, OneFactor, ShaderMaterial, ZeroFactor } from 'three';
import { INTRO } from '../lib/introPath';

const vertexShader = `
varying vec2 vUv;
void main() { vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const fragmentShader = `
uniform float uIntro; uniform float uStill; uniform float uTime;
varying vec2 vUv;
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float t = mix(uIntro, 7.0, uStill);
  float since = t - ${INTRO.ignite.toFixed(3)};
  // Flash on landing, then a faint breathing nebula behind the slash.
  float flash = since > 0.0 ? exp(-since * 2.2) : 0.0;
  float charge = smoothstep(${(INTRO.departure + .4).toFixed(3)}, ${INTRO.ignite.toFixed(3)}, t) * step(since, 0.0);
  float breath = smoothstep(${INTRO.ignite.toFixed(3)}, ${(INTRO.ignite + 1.2).toFixed(3)}, t) * (.85 + .15 * sin(uTime * .7)) * (1.0 - uStill * .4);
  float core = exp(-r * r * 9.0), wide = exp(-r * r * 3.2);
  vec3 color = vec3(1.0, .16, .12) * (wide * (.075 * breath + .12 * charge + .28 * flash))
    + vec3(1.0, .9, .86) * core * (.32 * flash + .08 * charge);
  // Alpha 0 with ONE/ONE colour blending: pure added light that keeps the canvas transparent.
  gl_FragColor = vec4(color * (1.0 - r), 0.0);
}
`;

/** Soft additive bloom behind the logo: charges while grains spiral in, flashes on ignition. */
export function IgniteGlow({ material }: { material: RefObject<ShaderMaterial | null> }) {
  const glow = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uIntro: { value: 0 }, uStill: { value: 0 }, uTime: { value: 0 } }), []);
  useFrame(() => {
    const source = material.current?.uniforms, target = glow.current?.uniforms;
    if (!source || !target) return;
    target.uIntro.value = source.uIntro.value; target.uStill.value = source.uStill.value; target.uTime.value = source.uTime.value;
  }, -1);
  return <mesh position={[0, 0, -.3]} renderOrder={-1}>
    <planeGeometry args={[3.4, 3.4]} />
    <shaderMaterial ref={glow} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false} depthTest={false} blending={CustomBlending} blendSrc={OneFactor} blendDst={OneFactor} blendSrcAlpha={ZeroFactor} blendDstAlpha={OneFactor} />
  </mesh>;
}
