varying vec3 vColor;
varying float vBrightness;
varying float vSpark;

void main() {
  vec2 uv = gl_PointCoord - .5;
  float r = length(uv) * 2.0;
  if (r > 1.0) discard;
  float core = exp(-r * r * 16.0);
  float glow = exp(-r * r * 4.6) * .24 * vSpark;
  float alpha = (core + glow) * vBrightness;
  gl_FragColor = vec4(vColor, alpha);
}
