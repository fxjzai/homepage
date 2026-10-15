import { useEffect, useRef } from 'react';
import { usePointerField } from '../hooks/usePointerField';
import targets from './logoTargetsLite.json';
import { createLogoFlow, flowPosition } from '../lib/logoFlow';
import logoSvg from '../../public/assets/brand-mark.svg?raw';
import type { SceneProps } from './sceneTypes';
import { coastParticle, particleMass, PointerMotion, stirParticle } from '../lib/pointerMotion';
import { departureTime, flightTime, haloDepth, haloPlace, haloRadius, hoverGlow, igniteWave, INTRO, introPlace, ringAttributes, ringGlow, shimmer } from '../lib/introPath';

const TAU = Math.PI * 2;
const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const hash = (x: number) => { const value = Math.sin(x * 127.1) * 43758.5453; return value - Math.floor(value); };
const HALO_COUNT = 900;

function makeGlow(red: boolean) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  const rgb = red ? '255,49,49' : '215,235,255';
  glow.addColorStop(0, red ? '#ff5550' : '#ffffff');
  glow.addColorStop(.075, red ? '#ff3733' : '#ffffff');
  glow.addColorStop(.18, `rgba(${rgb},.88)`);
  glow.addColorStop(.36, `rgba(${rgb},.23)`);
  glow.addColorStop(.68, `rgba(${rgb},.035)`);
  glow.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 64, 64);
  return canvas;
}

/** Real-time CPU projection for browsers without WebGL; no network data dependency. */
export default function CanvasParticleScene(props: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const pointer = usePointerField(container, props.paused, props.onReplay);
  const currentProps = useRef(props); currentProps.current = props;
  const wake = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    const node = container.current;
    if (!canvas || !node) return;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) { currentProps.current.onError(); return; }
    const ctx = context;
    const glows = [makeGlow(false), makeGlow(true)];
    const offsets = new Float32Array(targets.length * 4);
    const haloOffsets = new Float32Array(HALO_COUNT * 4);
    const skyOffsets = new Float32Array(1300 * 4);
    const motion = new PointerMotion();
    const stars = Array.from({ length: 1300 }, (_, i) => {
      const seed = hash(i + 551);
      const dust = i % 3 === 0;
      const radius = .4 + hash(i + 501) * 1.85;
      const angle = (i % 2) * Math.PI + radius * 2.1 + (hash(i + 931) - .5) * .8;
      const diameter = dust ? 1 + seed : 1.2 + seed ** 8 * 10;
      return { x: dust ? Math.cos(angle) * radius : hash(i * 1.71 + 55) * 2.12 - 1.06,
        y: dust ? Math.sin(angle) * radius * .72 : hash(i * 2.91 + 91) * 2.12 - 1.06,
        dust, diameter, warm: hash(i + 901) > .82, alpha: .25 + hash(i + 613) * .4,
        mass: particleMass(diameter, seed) };
    });
    const points = targets.map(([x, y, red], i) => {
      const seed = hash(i + 17.31);
      const rank = hash(i + 81.2);
      const [theta0, ringR, ringZ, jitter] = ringAttributes(i);
      return { x, y, z: (hash(i + 7.91) - .5) * .13, red, seed, phase: seed * TAU,
        mass: particleMass(rank > .935 ? 8 : 1, seed), bright: rank > .935, hero: rank > .992, radius: .40 + hash(i + 11.7) * .55,
        theta0, ringR, ringZ, start: departureTime(red, theta0, jitter), flight: flightTime(seed), centre: Math.hypot(x, y) };
    });
    // Orbit grains share the loading ring's index space after the logo grains, as on the GPU.
    const halo = Array.from({ length: HALO_COUNT }, (_, j) => {
      const i = targets.length + j, seed = hash(i * .917 + 5.5);
      const [theta0, ringR, ringZ] = ringAttributes(i);
      return { theta0, ringR, ringZ, seed, depth: haloDepth(i), alpha: .3 + hash(i * 2.71 + 3.3) * .55,
        warm: hash(seed * 71.3) > .88, radius: .45 + hash(i * 1.93 + .7) * .5, mass: particleMass(1, seed) };
    });
    const flow = createLogoFlow(new Float32Array(points.flatMap(p => [p.x, p.y, p.z])), new Float32Array(points.map(p => p.red)), new Float32Array(points.map(p => p.seed)), logoSvg);
    let width = 1, height = 1, ratio = 1, mobile = false, count = 6200;
    let rotationX = 0, rotationY = 0, animationTime = 0;
    let intro = Math.max(0, (performance.now() - currentProps.current.epoch) / 1000);
    let lastReplay = currentProps.current.replay;
    let frame = 0, frameRequest = 0, lastNow = 0, hasPainted = false;
    let sampleTime = 0, sampleFrames = 0, slowWindows = 0, disposed = false;

    const resize = () => {
      motion.reset();
      const rect = node.getBoundingClientRect();
      width = rect.width; height = rect.height; mobile = width <= 600;
      ratio = Math.min(window.devicePixelRatio || 1, mobile ? 1.15 : 1.5);
      count = mobile ? 3200 : 6200;
      canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
      schedule();
    };

    function paint(now: number) {
      const paintStart = performance.now();
      frameRequest = 0;
      if (disposed) return;
      const state = currentProps.current;
      if (!state.visible) { lastNow = 0; return; }
      const elapsed = lastNow ? (now - lastNow) / 1000 : 1 / 60;
      lastNow = now;
      const dt = Math.min(elapsed, .05);
      if (lastReplay !== state.replay) { intro = 0; offsets.fill(0); haloOffsets.fill(0); skyOffsets.fill(0); motion.reset(); lastReplay = state.replay; }
      if (state.paused) { intro = Math.max(intro, 7); offsets.fill(0); haloOffsets.fill(0); skyOffsets.fill(0); motion.reset(); rotationX = rotationY = 0; }
      else { intro += elapsed; animationTime += dt; }
      const field = pointer.current;
      if (!state.paused) {
        if (!field.dragging) {
          field.dragX = clamp((field.dragX + field.velocityX * dt) * Math.exp(-dt * 1.4), -.42, .42);
          field.dragY = clamp((field.dragY + field.velocityY * dt) * Math.exp(-dt * 1.4), -.65, .65);
          field.velocityX *= Math.exp(-dt * 5); field.velocityY *= Math.exp(-dt * 5);
        }
        const smoothing = 1 - Math.exp(-dt * 4.2);
        rotationX += (field.dragX - rotationX) * smoothing;
        rotationY += (field.dragY - rotationY) * smoothing;
      }
      const sx = Math.sin(rotationX), cx = Math.cos(rotationX), sy = Math.sin(rotationY), cy = Math.cos(rotationY);
      const scale = Math.min(width, height) * (mobile ? .395 : .315);
      const centerX = width / 2, centerY = height * (mobile ? .422 : .465);
      if (elapsed > .2) motion.reset();
      const movement = motion.sample(field.x, field.y, field.active && !field.dragging && !state.paused);
      const stroke = { x: field.x * width / height, y: field.y, dx: movement.x * width / height, dy: movement.y };
      const moving = stroke.dx * stroke.dx + stroke.dy * stroke.dy > 1e-8;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = clamp(intro * 1.6); ctx.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'lighter';
      const skyBatches = Array.from({ length: 8 }, () => new Path2D());
      const skySparks: number[][] = [];
      for (let i = 0; i < (mobile ? 500 : stars.length); i++) {
        const star = stars[i], k = i * 4;
        const x = star.x * (star.dust ? 1 : width / height), y = star.y;
        coastParticle(skyOffsets, k, star.mass, dt);
        if (moving) stirParticle(skyOffsets, k, star.mass, x, y, stroke);
        const px = width / 2 + (x + skyOffsets[k]) * height / 2;
        const py = height / 2 - (y + skyOffsets[k + 1]) * height / 2;
        if (star.diameter > 4) skySparks.push([px, py, star.diameter, star.alpha]);
        else {
          const bin = (star.warm ? 4 : 0) + Math.min(3, Math.floor(star.alpha * 4));
          const radius = star.diameter * .32;
          skyBatches[bin].moveTo(px + radius, py); skyBatches[bin].arc(px, py, radius, 0, TAU);
        }
      }
      for (let i = 0; i < skyBatches.length; i++) {
        ctx.globalAlpha = ((i % 4) + .5) / 4 * clamp(intro * 1.6);
        ctx.fillStyle = i < 4 ? '#c4e5ff' : '#ffc79d'; ctx.fill(skyBatches[i]);
      }
      for (const [x, y, diameter, alpha] of skySparks) {
        ctx.globalAlpha = alpha * clamp(intro * 1.6);
        ctx.drawImage(glows[0], x - diameter / 2, y - diameter / 2, diameter, diameter);
      }
      // Colour groups: 0 white, 1 red, 2 loading-ring cool, 3 loading-ring red head; 8 alpha bins each.
      const batches = Array.from({ length: 32 }, () => new Path2D());
      const sparks: number[][] = [];
      const quiet = state.paused ? 0 : 1;
      const t = state.paused ? 7 : intro;
      const hover = field.active && !field.dragging && !state.paused ? 1 : 0;
      const hoverX = field.x * width / height, hoverY = field.y;
      const project = (x: number, y: number, z: number) => {
        const rx = x * cy + z * sy, rz = -x * sy + z * cy;
        const ry = y * cx - rz * sx, depth = y * sx + rz * cx;
        const perspective = 1 / (1 - depth * .21);
        return { x: centerX + rx * scale * perspective, y: centerY - ry * scale * perspective, perspective, depth };
      };
      const push = (group: number, alpha: number, px: number, py: number, radius: number) => {
        const bin = group * 8 + Math.min(7, Math.floor(clamp(alpha) * 8));
        batches[bin].moveTo(px + radius, py); batches[bin].arc(px, py, radius, 0, TAU);
      };
      // Igniting flash and the nebula that breathes behind the slash afterwards.
      const since = t - INTRO.ignite;
      const flash = since > 0 ? Math.exp(-since * 2.2) : 0;
      const charge = since < 0 ? clamp((t - INTRO.departure - .4) / (INTRO.ignite - INTRO.departure - .4)) : 0;
      const breath = clamp((t - INTRO.ignite) / 1.2) * (.85 + .15 * Math.sin(animationTime * .7)) * (state.paused ? .6 : 1);
      const bloom = .075 * breath + .12 * charge + .28 * flash;
      if (bloom > .002) {
        const radius = scale * 1.6;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, `rgba(255,${Math.round(40 + 190 * flash)},${Math.round(30 + 190 * flash)},${clamp(bloom * 1.6)})`);
        gradient.addColorStop(.35, `rgba(255,41,31,${clamp(bloom * .6)})`);
        gradient.addColorStop(1, 'rgba(255,41,31,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = gradient;
        ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
      }
      for (let i = 0; i < count; i++) {
        const p = points[i];
        const flowIndex = i * 4;
        const stream = state.paused ? p : flowPosition(p.x, p.y, flow.paths[flowIndex], flow.paths[flowIndex + 1], flow.paths[flowIndex + 2], flow.paths[flowIndex + 3], p.seed, animationTime);
        const restZ = p.z + Math.sin(animationTime * .38 + p.phase * 4) * .02 * quiet;
        const place = introPlace(p.theta0, p.ringR, p.ringZ, stream.x, stream.y, restZ, 0, 0, p.start, p.flight, t);
        const ring = ringGlow(p.theta0, t);
        if (ring + place.progress < .001) continue;
        const projected = project(place.x, place.y, place.z);
        const k = i * 4;
        coastParticle(offsets, k, p.mass, dt);
        if (moving) stirParticle(offsets, k, p.mass, (projected.x - width / 2) * 2 / height, 1 - projected.y * 2 / height, stroke);
        const px = projected.x + offsets[k] * height / 2, py = projected.y - offsets[k + 1] * height / 2;
        if (px < -30 || px > width + 30 || py < -30 || py > height + 30) continue;
        const twinkle = state.paused ? 1 : .77 + .23 * Math.sin(animationTime * (.32 + p.seed * .53) + p.phase * 11);
        const slashPosition = (stream.x + stream.y + 1.45) / 2.9;
        const sweepPosition = ((t - INTRO.sweepStart) % 2.8) / 1.15 * 1.4 - .2;
        const sweepDistance = (slashPosition - sweepPosition) * 11;
        const sweep = p.red && !state.paused && t >= INTRO.sweepStart ? Math.exp(-(sweepDistance * sweepDistance)) : 0;
        const inFlight = place.progress > 0 && place.progress < 1 ? Math.sin(place.progress * Math.PI) : 0;
        const wave = igniteWave(p.centre, t) * quiet;
        const glow = hoverGlow(Math.hypot((px - width / 2) * 2 / height - hoverX, 1 - py * 2 / height - hoverY), hover);
        const arrived = clamp((place.progress - .15) / .85);
        const rest = (.5 + p.seed * .4 + p.red * .1) * twinkle * (state.paused ? 1 : shimmer(stream.x, stream.y, p.seed, animationTime)) * flow.softness[i];
        const alpha = ring * (1 - arrived) + rest * arrived + inFlight * .4 + wave * .7 + sweep * .65 + glow * .6;
        const boost = 1 + sweep * .5 + wave * .8 + inFlight * .4 + glow * .7;
        if (place.progress < .5) push(p.theta0 / TAU > .9 ? 3 : 2, alpha, px, py, p.radius * projected.perspective * (mobile ? .85 : 1) * boost);
        else if (p.bright || wave > .4 || glow > .5) {
          const glowSize = (p.hero ? 25 : 10 + p.seed * 7) * (mobile ? .8 : 1) * projected.perspective * boost;
          sparks.push([px, py, glowSize, clamp(alpha), p.red]);
        } else push(p.red, alpha, px, py, p.radius * projected.perspective * (mobile ? .85 : 1) * boost);
      }
      for (let j = 0; j < (mobile ? HALO_COUNT / 2 : HALO_COUNT); j++) {
        const h = halo[j];
        const orbit = haloPlace(h.theta0, h.ringR, h.ringZ, haloRadius(targets.length + j, mobile), h.depth, t);
        const ring = ringGlow(h.theta0, t);
        const projected = project(orbit.x, orbit.y, orbit.z);
        const k = j * 4;
        coastParticle(haloOffsets, k, h.mass, dt);
        if (moving) stirParticle(haloOffsets, k, h.mass, (projected.x - width / 2) * 2 / height, 1 - projected.y * 2 / height, stroke);
        const px = projected.x + haloOffsets[k] * height / 2, py = projected.y - haloOffsets[k + 1] * height / 2;
        if (px < -30 || px > width + 30 || py < -30 || py > height + 30) continue;
        const front = .62 + .38 * clamp(orbit.z * .9 + .5);
        const alpha = ring * .85 * (1 - orbit.settle) + h.alpha * front * orbit.settle;
        const group = orbit.settle < .5 ? (h.theta0 / TAU > .9 ? 3 : 2) : h.warm ? 1 : 0;
        push(group, alpha, px, py, h.radius * projected.perspective * (mobile ? .85 : 1));
      }
      const colours = ['#e3f0ff', '#ff3131', '#9fc7ff', '#ff2a1f'];
      for (let i = 0; i < 32; i++) {
        ctx.globalAlpha = ((i % 8) + .5) / 8;
        ctx.fillStyle = colours[i >> 3]; ctx.fill(batches[i]);
      }
      for (const [x, y, diameter, alpha, red] of sparks) {
        ctx.globalAlpha = alpha;
        ctx.drawImage(glows[red], x - diameter / 2, y - diameter / 2, diameter, diameter);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      frame++;
      if (!hasPainted) { hasPainted = true; state.onReady(); }
      sampleTime += elapsed; sampleFrames++;
      if (sampleTime >= .75 || state.paused) {
        const fps = state.paused ? 0 : Math.round(sampleFrames / sampleTime);
        state.onMetrics?.({ renderer: 'Canvas 2D', fps, particles: count, frame, rotation: rotationY, intro, paintMs: performance.now() - paintStart });
        if (!state.paused && intro > 5) {
          slowWindows = fps < 40 ? slowWindows + 1 : 0;
          if (slowWindows >= 3 && count > 2400) { count = Math.max(2400, Math.floor(count * .75 / 100) * 100); slowWindows = 0; }
        }
        sampleTime = 0; sampleFrames = 0;
      }
      if (!state.paused && state.visible) schedule();
      else lastNow = 0;
    }
    function schedule() { if (!frameRequest && !disposed) frameRequest = requestAnimationFrame(paint); }
    wake.current = () => {
      // Reset immediately: hidden tabs may never execute a pending RAF callback.
      lastNow = 0; sampleTime = 0; sampleFrames = 0; motion.reset();
      if (!currentProps.current.visible) { cancelAnimationFrame(frameRequest); frameRequest = 0; }
      else schedule();
    };
    const observer = new ResizeObserver(resize); observer.observe(node); resize();
    return () => { disposed = true; cancelAnimationFrame(frameRequest); observer.disconnect(); wake.current = () => {}; };
  }, [pointer]);

  useEffect(() => { wake.current(); }, [props.paused, props.visible, props.replay]);
  return <div ref={container} className="scene-container" role="img" aria-label="可交互的白色与红色粒子 Logo，支持拖拽旋转和重播">
    <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
  </div>;
}
