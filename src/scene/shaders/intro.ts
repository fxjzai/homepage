import { INTRO as settings } from '../../lib/introPath';
const glsl = (value: number) => value.toFixed(6);

/** GLSL mirror of src/lib/introPath.ts; tests cover the JS equations. */
export const introShader = `
#define TAU 6.283185307
#define SWEEP_START ${glsl(settings.sweepStart)}
float introSmooth(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
float ringSpin(float t) { return ${glsl(settings.spinRate)} * t + .5 * ${glsl(settings.spinAccel)} * t * t; }
float ringRate(float t) { return ${glsl(settings.spinRate)} + ${glsl(settings.spinAccel)} * t; }
float ringGlow(float theta0, float t) { float arc = theta0 / TAU; return (.14 + .86 * arc * arc * arc) * introSmooth(0.0, ${glsl(settings.fadeIn)}, t); }
float departureTime(float kind, float theta0, float jitter) {
  return ${glsl(settings.departure)} + kind * ${glsl(settings.redDelay)} + (1.0 - theta0 / TAU) * ${glsl(settings.arcDelay)} + jitter * ${glsl(settings.jitter)};
}
float flightTime(float seed) { return ${glsl(settings.flight)} + seed * ${glsl(settings.flightJitter)}; }
float igniteWave(float radius, float t) {
  float elapsed = t - ${glsl(settings.ignite)};
  if (elapsed < 0.0) return 0.0;
  float distance = (radius - elapsed * ${glsl(settings.igniteSpeed)}) * 5.0;
  return exp(-distance * distance) * (1.0 - introSmooth(0.0, 1.4, elapsed)) + exp(-elapsed * 3.0) * .35;
}
float shimmer(vec2 p, float seed, float time) {
  float wave = .5 + .5 * sin((p.x * .8 - p.y * .6) * 7.0 - time * 1.1 + seed * .6);
  return .82 + .36 * wave * wave * wave * wave;
}
float hoverGlow(float distance, float intensity) { return exp(-distance * distance * 28.0) * intensity; }

vec4 introPlace(float theta0, float ringR, float ringZ, vec3 rest, vec2 drift, float start, float flight, float t) {
  float ringAngle = theta0 + ringSpin(min(t, start));
  if (t <= start) return vec4(cos(ringAngle) * ringR, sin(ringAngle) * ringR, ringZ, 0.0);
  float s = min(1.0, (t - start) / flight);
  if (s >= 1.0) return vec4(rest.xy + drift, rest.z, 1.0);
  float m0 = ringRate(start) * flight;
  float sweep = m0 * .5 + mod(atan(rest.y, rest.x + .000001) - ringAngle - m0 * .5, TAU);
  float s2 = s * s, s3 = s2 * s, ease = 3.0 * s2 - 2.0 * s3;
  float angle = ringAngle + (s3 - 2.0 * s2 + s) * m0 + ease * sweep;
  float radius = ringR + (length(rest.xy) - ringR) * ease;
  return vec4(vec2(cos(angle), sin(angle)) * radius + drift * ease, ringZ + (rest.z - ringZ) * ease, s);
}

float orbitRate(float radius) { return ${glsl(settings.haloRate)} * pow(1.5 / radius, 1.5); }
float haloSpin(float t, float rate) {
  float t1 = ${glsl(settings.haloRelease)}, t2 = ${glsl(settings.haloSettle)};
  float a = min(t, t1), w1 = ringRate(t1), b = clamp(t - t1, 0.0, t2 - t1);
  return ringSpin(a) + w1 * b + .5 * (rate - w1) / (t2 - t1) * b * b + rate * max(0.0, t - t2);
}
vec4 haloPlace(float theta0, float ringR, float ringZ, float orbitR, float orbitZ, float t) {
  float angle = theta0 + haloSpin(t, orbitRate(orbitR));
  float k = introSmooth(${glsl(settings.haloRelease + .1)}, ${glsl(settings.haloSettle + .2)}, t);
  float r = mix(ringR, orbitR, k), z = mix(ringZ, orbitZ, k);
  float x = cos(angle) * r, y = sin(angle) * r;
  float tilt = ${glsl(settings.haloTilt)} * k, roll = ${glsl(settings.haloRoll)} * k;
  float ty = y * cos(tilt) - z * sin(tilt), tz = y * sin(tilt) + z * cos(tilt);
  return vec4(x * cos(roll) - ty * sin(roll), x * sin(roll) + ty * cos(roll), tz, k);
}
`;
