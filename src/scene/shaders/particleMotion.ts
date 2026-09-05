import { PARTICLE_MOTION as settings } from '../../lib/pointerMotion';
const glsl = (value: number) => value.toFixed(6);

/** The render and state-write passes share the same projection and motion math. */
export const particleMotionShader = `
attribute vec3 aMotion;
uniform sampler2D uMotionTexture;
uniform float uMotionAge;
uniform float uMotionEnabled;
uniform float uMotionAspect;
uniform vec2 uMotionPointer;
uniform vec2 uMotionTravel;
varying vec4 vMotionState;

void applyParticleMotion(inout vec4 clip) {
  vec4 state = vec4(0.0);
  if (uMotionEnabled > .5 && uMotionAge < ${glsl(settings.lifetime)}) {
    state = texture2D(uMotionTexture, aMotion.xy);
    float drag = ${glsl(settings.drag)} / sqrt(aMotion.z);
    float velocityDecay = exp(-drag * uMotionAge);
    float returnDecay = exp(-${glsl(settings.returnRate)} * uMotionAge);
    state.xy = state.xy * returnDecay + state.zw * (returnDecay - velocityDecay) / (drag - ${glsl(settings.returnRate)});
    state.zw *= velocityDecay;
    // Only trim the imperceptible tail; no forced two-second snap back.
    state *= 1.0 - smoothstep(5.0, ${glsl(settings.lifetime)}, uMotionAge);
  }
  vec2 scale = vec2(uMotionAspect, 1.0);
#ifdef PARTICLE_MOTION_PASS
  vec2 current = clip.xy / clip.w * scale + state.xy;
  vec2 start = uMotionPointer - uMotionTravel;
  float pathLength = dot(uMotionTravel, uMotionTravel);
  float along = clamp(dot(current - start, uMotionTravel) / max(pathLength, .00000001), 0.0, 1.0);
  float distance = length(current - start - uMotionTravel * along);
  float falloff = 1.0 - smoothstep(0.0, ${glsl(settings.radius)}, distance);
  vec2 impulse = uMotionTravel * min(1.0, ${glsl(settings.maxImpulse)} / max(length(uMotionTravel), .00001));
  state.zw += impulse * falloff * falloff * ${glsl(settings.gain)} / aMotion.z;
  state.zw *= min(1.0, ${glsl(settings.maxSpeed)} / max(length(state.zw), .00001));
  vMotionState = state;
  clip = vec4(aMotion.xy * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 1.0;
#else
  clip.xy += state.xy / scale * clip.w;
#endif
}
`;
