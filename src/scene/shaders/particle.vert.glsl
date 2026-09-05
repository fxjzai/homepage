uniform float uTime;
uniform float uIntro;
uniform float uStill;
uniform float uDpr;
uniform float uScale;
attribute vec4 aParameters;
attribute vec4 aFlow;
attribute float aSoftness;
varying vec3 vColor;
varying float vBrightness;
varying float vSpark;

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float ease(float x) {
  float inverse = 1.0 - x;
  return 1.0 - inverse * inverse * inverse;
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
  float flowPhase = fract(uTime * (.065 + seed * .035) + seed) * 3.0;
  float segment = floor(flowPhase), t = fract(flowPhase), u = 1.0 - t;
  vec2 p = segment < .5 ? aFlow.zw : segment < 1.5 ? position.xy : aFlow.xy;
  vec2 q = segment < .5 ? position.xy : segment < 1.5 ? aFlow.xy : aFlow.zw;
  vec2 r = segment < .5 ? aFlow.xy : segment < 1.5 ? aFlow.zw : position.xy;
  target.xy = mix(position.xy, u*u*(p+q)*.5 + 2.0*u*t*q + t*t*(q+r)*.5, quiet);
  target.z += sin(uTime * .38 + phase * 4.0) * .008 * quiet;
  vec3 point = mix(scattered, target, progress);
  vec4 mvPosition = modelViewMatrix * vec4(point, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float starRank = hash(seed * 33.17);
  float brightStar = step(.935, starRank);
  float heroStar = step(.993, starRank);
  float twinkle = mix(1.0, .77 + .23 * sin(uTime * (.32 + random * .53) + phase * 11.0), quiet);
  float sweep = 0.0;
  if (kind > .5 && quiet > .5 && uIntro >= 3.65) {
    float sweepPosition = mod(uIntro - 3.65, 2.8) / 1.15 * 1.4 - .2;
    float alongSlash = (target.x + target.y + 1.45) / 2.9;
    float sweepDistance = (alongSlash - sweepPosition) * 11.0;
    // GLSL pow(negative, 2.0) is undefined on some GPU drivers. Multiply
    // explicitly so NaN cannot contaminate point size or brightness.
    sweep = exp(-(sweepDistance * sweepDistance));
  }
  float pixelSize = mix(.80 + size * .7, 4.0 + size * 3.0, brightStar) + heroStar * 10.0;
  gl_PointSize = clamp(pixelSize * uDpr * uScale * (4.8 / -mvPosition.z) * (1.0 + sweep * .7), .7, 36.0);
  vec3 white = mix(vec3(.68,.82,1.0), vec3(.96,.98,1.0), seed * .5 + .5);
  vec3 red = vec3(1.0, .035 + seed * .03, .032 + seed * .018);
  vColor = mix(white, red, kind);
  vColor = mix(vColor, vec3(1.0, .28, .20), sweep * .5);
  vBrightness = (.24 + light * .80 + brightStar * .85 + kind * .17) * twinkle * smoothstep(.05, .9, progress) + sweep * .85;
  vBrightness *= aSoftness;
  vSpark = brightStar + heroStar * .45;
  applyParticleMotion(gl_Position);
}
