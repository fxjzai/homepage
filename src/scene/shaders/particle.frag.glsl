varying vec3 vColor;
varying float vBrightness;
varying float vSpark;
varying float vHeat;
varying float vFlare;

void main() {
  vec2 uv = gl_PointCoord - .5;
  float r = length(uv) * 2.0;
  if (r > 1.0) discard;
  float r2 = r * r;
  float core = exp(-r2 * 16.0);
  float glow = exp(-r2 * 4.6) * .24 * vSpark;
  // Thin four-point diffraction spikes on the rare hero stars.
  vec2 a = abs(uv) * 2.0;
  float spikes = (exp(-a.x * 48.0) + exp(-a.y * 48.0)) * (1.0 - r) * vFlare;
  float alpha = (core + glow + spikes) * vBrightness;
  // Hot grains burn towards white at their centre.
  vec3 color = mix(vColor, vec3(1.0, .97, .94), clamp(core * vHeat * .8 + spikes * .5, 0.0, 1.0));
  gl_FragColor = vec4(color, alpha);
}
