uniform float uTime;
uniform float uIntro;
uniform float uStill;
uniform float uDpr;
uniform float uScale;
uniform vec3 uPointer;
uniform float uPointerStrength;
uniform vec4 uTrail[8];
attribute vec4 aParameters;
varying vec3 vColor;
varying float vBrightness;
varying float vSpark;

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float ease(float x) {
  float inverse = 1.0 - x;
  return 1.0 - inverse * inverse * inverse;
}
vec3 fieldAt(vec2 point, vec2 origin, float strength) {
  vec2 delta = point - origin;
  float distance = length(delta);
  float falloff = 1.0 - smoothstep(.01, .46, distance);
  vec2 radial = delta / max(distance, .001);
  vec2 tangent = vec2(-radial.y, radial.x);
  float force = falloff * falloff * strength;
  return vec3((radial * .12 + tangent * .072) * force, .24 * force);
}

void main() {
  float kind = aParameters.x;
  float seed = aParameters.y;
  float size = aParameters.z;
  float light = aParameters.w;
  float random = hash(seed * 231.7);
  float phase = seed * 6.283185;
  float start = 1.05 + kind * .48 + random * .42;
  float progress = mix(ease(clamp((uIntro - start) / (2.25 + seed * .28), 0.0, 1.0)), 1.0, uStill);
  float radius = 2.1 + hash(seed * 93.1) * 2.4;
  float angle = phase * 3.0 + (1.0 - progress) * (1.4 + seed);
  vec3 scattered = vec3(cos(angle) * radius, sin(angle) * radius, (random - .5) * 2.8);
  vec3 target = position;
  float quiet = 1.0 - uStill;
  target.x += sin(uTime * .31 + phase * 12.0) * .004 * quiet;
  target.y += cos(uTime * .27 + phase * 8.0) * .004 * quiet;
  target.z += sin(uTime * .38 + phase * 4.0) * .013 * quiet;
  // A few grains travel along the supplied contour's local tangent.
  float traveler = step(.965, random);
  target.xy += vec2(sin(uTime * .47 + phase), cos(uTime * .47 + phase)) * .012 * traveler * quiet;
  vec3 point = mix(scattered, target, progress);
  vec3 displacement = fieldAt(point.xy, uPointer.xy, uPointerStrength);
  for (int i = 0; i < 8; i++) {
    float age = max(0.0, uTime - uTrail[i].w);
    // Analytic critically damped response preserves a soft wake and returns
    // to under 5% around 1.8 seconds after the pointer leaves.
    float spring = (1.0 + age * 2.65) * exp(-age * 2.65);
    vec3 past = fieldAt(point.xy, uTrail[i].xy, spring);
    if (past.z > displacement.z) displacement = past;
  }
  point += displacement * (1.0 - kind * .20) * progress * quiet;

  vec4 mvPosition = modelViewMatrix * vec4(point, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float starRank = hash(seed * 33.17);
  float brightStar = step(.935, starRank);
  float heroStar = step(.993, starRank);
  float twinkle = mix(1.0, .77 + .23 * sin(uTime * (.32 + random * .53) + phase * 11.0), quiet);
  float sweep = 0.0;
  if (kind > .5 && quiet > .5 && uIntro >= 3.65 && uIntro < 4.65) {
    float sweepPosition = (uIntro - 3.65) / .85;
    float alongSlash = (position.x + position.y + 1.45) / 2.9;
    float sweepDistance = (alongSlash - sweepPosition) * 11.0;
    // GLSL pow(negative, 2.0) is undefined on some GPU drivers. Multiply
    // explicitly so NaN cannot contaminate point size or brightness.
    sweep = exp(-(sweepDistance * sweepDistance));
  }
  // A slow breathing-light cycle keeps the red slash alive without flashing.
  float breathPhase = mod(uTime, 2.8) / 2.8;
  float breath = .5 - .5 * cos(breathPhase * 6.283185);
  breath = breath * breath * (3.0 - 2.0 * breath);
  breath *= kind * quiet * smoothstep(4.2, 5.2, uIntro);
  float pixelSize = mix(.80 + size * .7, 4.0 + size * 3.0, brightStar) + heroStar * 10.0;
  gl_PointSize = clamp(pixelSize * uDpr * uScale * (4.8 / -mvPosition.z) * (1.0 + sweep * .4 + breath * .16), .7, 36.0);
  vec3 white = mix(vec3(.68,.82,1.0), vec3(.96,.98,1.0), seed * .5 + .5);
  vec3 red = vec3(1.0, .035 + seed * .03, .032 + seed * .018);
  vColor = mix(white, red, kind);
  vBrightness = (.24 + light * .80 + brightStar * .85 + kind * .17) * twinkle * smoothstep(.05, .9, progress) + sweep * .45 + breath * .55;
  vSpark = brightStar + heroStar * .45;
}
