import { useEffect, useMemo, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, Color, HalfFloatType, NearestFilter, NoBlending, Points, Scene, ShaderMaterial, Vector2, WebGLRenderTarget } from 'three';
import type { PointerField } from '../hooks/usePointerField';
import { PARTICLE_MOTION, particleMass, PointerMotion } from '../lib/pointerMotion';

/** Each texel stores one particle's screen displacement and velocity (RGBA).
 * Commit only on new input. Between strokes the vertex shader integrates drag
 * analytically, so idle motion needs no extra simulation draw calls.
 */
export function useParticleMotion(geometry: BufferGeometry, source: RefObject<Points<BufferGeometry, ShaderMaterial> | null>, pointer: RefObject<PointerField>, paused: boolean, replay: number) {
  const { size } = useThree();
  const simulation = useMemo(() => {
    const count = geometry.getAttribute('position').count;
    const columns = 128, rows = Math.ceil(count / columns);
    const uvMass = new Float32Array(count * 3);
    const logo = geometry.getAttribute('aParameters');
    const star = geometry.getAttribute('aSize');
    for (let i = 0; i < count; i++) {
      const seed = logo ? logo.getY(i) : ((i * 1664525 + 1013904223) >>> 0) / 4294967296;
      const size = logo ? logo.getZ(i) : star.getX(i);
      uvMass.set([((i % columns) + .5) / columns, (Math.floor(i / columns) + .5) / rows, particleMass(size, seed)], i * 3);
    }
    geometry.setAttribute('aMotion', new BufferAttribute(uvMass, 3));
    const options = { type: HalfFloatType, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: false, stencilBuffer: false };
    const front = new WebGLRenderTarget(columns, rows, options);
    const back = front.clone();
    const uniforms = {
      uMotionTexture: { value: front.texture }, uMotionAge: { value: PARTICLE_MOTION.lifetime }, uMotionEnabled: { value: 0 },
      uMotionAspect: { value: 1 }, uMotionPointer: { value: new Vector2() }, uMotionTravel: { value: new Vector2() },
    };
    const material = new ShaderMaterial({
      defines: { PARTICLE_MOTION_PASS: 1 }, uniforms,
      fragmentShader: 'varying vec4 vMotionState; void main() { gl_FragColor = vMotionState; }',
      blending: NoBlending, depthTest: false, depthWrite: false, toneMapped: false,
    });
    const points = new Points(geometry, material);
    points.matrixAutoUpdate = false; points.frustumCulled = false;
    const scene = new Scene(); scene.add(points);
    return { front, back, uniforms, material, points, scene, input: new PointerMotion(), initialized: false, clearColor: new Color() };
  }, [geometry]);

  useEffect(() => { simulation.input.reset(); }, [simulation, size.width, size.height]);
  useEffect(() => {
    simulation.initialized = false; simulation.input.reset();
    const values = source.current?.material.uniforms ?? simulation.uniforms;
    values.uMotionEnabled.value = 0; values.uMotionAge.value = PARTICLE_MOTION.lifetime;
  }, [paused, replay, simulation, source]);
  useEffect(() => {
    // StrictMode replays effects in development: restore the simulation draw.
    simulation.scene.add(simulation.points);
    return () => { simulation.front.dispose(); simulation.back.dispose(); simulation.material.dispose(); simulation.scene.clear(); };
  }, [simulation]);

  useFrame(({ gl, camera }, delta) => {
    const points = source.current;
    if (!points) return;
    const values = points.material.uniforms;
    values.uMotionAspect.value = size.width / Math.max(1, size.height);
    values.uMotionAge.value = Math.min(PARTICLE_MOTION.lifetime, values.uMotionAge.value + delta);
    if (delta > .2) simulation.input.reset();
    const field = pointer.current;
    const travel = simulation.input.sample(field.x, field.y, field.active && !field.dragging && !paused);
    if (paused || travel.x * travel.x + travel.y * travel.y < 1e-8) return;
    const previousTarget = gl.getRenderTarget(), previousAlpha = gl.getClearAlpha();
    gl.getClearColor(simulation.clearColor);
    const previousAutoClear = gl.autoClear;
    try {
      gl.autoClear = true; gl.setClearColor(0, 0);
      if (!simulation.initialized) {
        gl.setRenderTarget(simulation.front); gl.clear();
        values.uMotionTexture.value = simulation.front.texture;
        values.uMotionAge.value = 0; values.uMotionEnabled.value = 1;
        simulation.initialized = true;
      }
      values.uMotionPointer.value.set(field.x * values.uMotionAspect.value, field.y);
      values.uMotionTravel.value.set(travel.x * values.uMotionAspect.value, travel.y);
      if (simulation.material.vertexShader !== points.material.vertexShader) {
        simulation.material.vertexShader = points.material.vertexShader; simulation.material.needsUpdate = true;
      }
      simulation.material.uniforms = values;
      points.updateWorldMatrix(true, false);
      simulation.points.matrix.copy(points.matrixWorld);
      gl.setRenderTarget(simulation.back); gl.render(simulation.scene, camera);
      [simulation.front, simulation.back] = [simulation.back, simulation.front];
      values.uMotionTexture.value = simulation.front.texture; values.uMotionAge.value = 0;
    } finally {
      gl.setRenderTarget(previousTarget); gl.setClearColor(simulation.clearColor, previousAlpha); gl.autoClear = previousAutoClear;
    }
  }, -1);
  return simulation.uniforms;
}
