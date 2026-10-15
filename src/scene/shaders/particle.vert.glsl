uniform float uTime;
uniform float uIntro;
uniform float uStill;
uniform float uDpr;
uniform float uScale;
uniform vec2 uHover;
uniform float uHoverStrength;
attribute vec4 aParameters;
attribute vec4 aFlow;
attribute float aSoftness;
attribute vec4 aRing;
attribute vec2 aHalo;
varying vec3 vColor;
varying float vBrightness;
varying float vSpark;
varying float vHeat;
varying float vFlare;

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

void main() {
  float kind = aParameters.x;
  float seed = aParameters.y;
  float size = aParameters.z;
  float light = aParameters.w;
  float random = hash(seed * 231.7);
  float phase = seed * TAU;
  float quiet = 1.0 - uStill;
  float t = mix(uIntro, 7.0, uStill);
  float halo = step(1.5, kind);
  float red = step(.5, kind) * (1.0 - halo);
  float starRank = hash(seed * 33.17);
  float brightStar = step(.935, starRank);
  float heroStar = step(.993, starRank) * (1.0 - halo);
  float twinkle = mix(1.0, .77 + .23 * sin(uTime * (.32 + random * .53) + phase * 11.0), quiet);

  // Loading ring: a bright red head and a cool fading tail, spinning counter-clockwise.
  float arc = aRing.x / TAU;
  float ring = ringGlow(aRing.x, t);
  vec3 ringColor = mix(vec3(.62, .78, 1.0), vec3(1.0, .16, .12), arc * arc * arc * arc * arc * arc);

  vec3 target = position;
  vec3 point;
  float arrival, wave = 0.0, flight = 0.0, sweep = 0.0;
  vec3 color;
  float brightness;
  if (halo > .5) {
    vec4 orbit = haloPlace(aRing.x, aRing.y, aRing.z, aHalo.x, aHalo.y, t);
    point = orbit.xyz; arrival = orbit.w;
    float warm = step(.88, hash(seed * 71.3));
    vec3 haloColor = mix(mix(vec3(.55, .72, 1.0), vec3(.92, .95, 1.0), random), vec3(1.0, .26, .2), warm);
    // Grains in front of the logo read brighter than those passing behind it.
    float depth = .62 + .38 * clamp(point.z * .9 + .5, 0.0, 1.0);
    color = mix(ringColor, haloColor, arrival);
    brightness = mix(ring * .85, (.34 + light * .75 + brightStar * .9) * depth * twinkle, arrival);
  } else {
    float flowPhase = fract(uTime * (.065 + seed * .035) + seed) * 3.0;
    float segment = floor(flowPhase), s = fract(flowPhase), u = 1.0 - s;
    vec2 p = segment < .5 ? aFlow.zw : segment < 1.5 ? position.xy : aFlow.xy;
    vec2 q = segment < .5 ? position.xy : segment < 1.5 ? aFlow.xy : aFlow.zw;
    vec2 r = segment < .5 ? aFlow.xy : segment < 1.5 ? aFlow.zw : position.xy;
    target.xy = mix(position.xy, u*u*(p+q)*.5 + 2.0*u*s*q + s*s*(q+r)*.5, quiet);
    target.z += sin(uTime * .38 + phase * 4.0) * .008 * quiet;
    vec4 place = introPlace(aRing.x, aRing.y, aRing.z, target, vec2(0.0), departureTime(red, aRing.x, aRing.w), flightTime(seed), t);
    point = place.xyz; arrival = place.w;
    flight = arrival > 0.0 && arrival < 1.0 ? sin(arrival * 3.14159) : 0.0;
    wave = igniteWave(length(position.xy), t) * quiet;
    if (red > .5 && quiet > .5 && t >= SWEEP_START) {
      float sweepPosition = mod(t - SWEEP_START, 2.8) / 1.15 * 1.4 - .2;
      float alongSlash = (target.x + target.y + 1.45) / 2.9;
      float sweepDistance = (alongSlash - sweepPosition) * 11.0;
      // GLSL pow(negative, 2.0) is undefined on some GPU drivers. Multiply
      // explicitly so NaN cannot contaminate point size or brightness.
      sweep = exp(-(sweepDistance * sweepDistance));
    }
    vec3 white = mix(vec3(.68,.82,1.0), vec3(.96,.98,1.0), seed * .5 + .5);
    vec3 crimson = vec3(1.0, .035 + seed * .03, .032 + seed * .018);
    color = mix(mix(white, crimson, red), vec3(1.0, .28, .20), sweep * .5);
    color = mix(ringColor, color, smoothstep(0.0, .7, arrival));
    float rest = (.24 + light * .80 + brightStar * .85 + red * .17) * twinkle * mix(1.0, shimmer(target.xy, seed, uTime), quiet);
    brightness = mix(ring, rest, smoothstep(.15, 1.0, arrival)) + flight * .55 + wave * .9 + sweep * .85;
    brightness *= mix(1.0, aSoftness, arrival);
  }

  vec4 mvPosition = modelViewMatrix * vec4(point, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vec2 screen = gl_Position.xy / gl_Position.w * vec2(uMotionAspect, 1.0);
  float hover = hoverGlow(length(screen - uHover), uHoverStrength) * quiet;

  float pixelSize = halo > .5 ? mix(1.1 + size * 1.1, 3.6 + size * 2.4, brightStar)
    : mix(.80 + size * .7, 4.0 + size * 3.0, brightStar) + heroStar * 10.0;
  pixelSize *= 1.0 + sweep * .7 + wave * .9 + flight * .45 + hover * .8;
  gl_PointSize = clamp(pixelSize * uDpr * uScale * (4.8 / -mvPosition.z), .7, 48.0);
  vColor = color;
  vBrightness = (brightness + hover * .75) * step(.001, ring + arrival);
  vSpark = brightStar + heroStar * .45 + flight * .6 + wave * .8;
  vHeat = clamp(wave + hover + sweep * .4 + flight * .5, 0.0, 1.0);
  vFlare = heroStar * (.55 + wave * 2.0 + hover) * smoothstep(.6, 1.0, arrival);
  applyParticleMotion(gl_Position);
}
