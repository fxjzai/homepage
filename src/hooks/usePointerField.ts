import { useEffect, useRef, type RefObject } from 'react';

export type PointerField = {
  x: number; y: number; active: boolean; dragging: boolean;
  dragX: number; dragY: number; velocityX: number; velocityY: number;
};
const clamp = (value: number, max: number) => Math.max(-max, Math.min(max, value));

export function usePointerField(element: RefObject<HTMLDivElement | null>, paused: boolean, onReplay: () => void) {
  const field = useRef<PointerField>({ x: 0, y: 0, active: false, dragging: false, dragX: 0, dragY: 0, velocityX: 0, velocityY: 0 });
  const replayRef = useRef(onReplay);
  replayRef.current = onReplay;
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const state = field.current;
    let pointerId: number | null = null;
    let startX = 0, startY = 0, lastX = 0, lastY = 0, distance = 0;
    const update = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      state.x = clamp((event.clientX - rect.left) / rect.width * 2 - 1, 1);
      state.y = clamp(-((event.clientY - rect.top) / rect.height * 2 - 1), 1);
      state.active = true;
    };
    const move = (event: PointerEvent) => {
      if (paused || (pointerId !== null && event.pointerId !== pointerId)) return;
      update(event);
      if (!state.dragging) return;
      const dx = (event.clientX - lastX) / node.clientWidth;
      const dy = (event.clientY - lastY) / node.clientHeight;
      distance = Math.max(distance, Math.hypot(event.clientX - startX, event.clientY - startY));
      state.dragY = clamp(state.dragY + dx * 2.1, .65);
      state.dragX = clamp(state.dragX + dy * 1.5, .42);
      state.velocityY = clamp(dx * 9, .4);
      state.velocityX = clamp(dy * 7, .3);
      lastX = event.clientX; lastY = event.clientY;
    };
    const down = (event: PointerEvent) => {
      if (paused || pointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
      pointerId = event.pointerId; state.dragging = true;
      startX = lastX = event.clientX; startY = lastY = event.clientY; distance = 0;
      state.velocityX = state.velocityY = 0;
      update(event); node.setPointerCapture(event.pointerId); node.classList.add('is-dragging');
    };
    const end = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const wasDragging = state.dragging;
      state.dragging = false; pointerId = null; node.classList.remove('is-dragging');
      if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
      if (event.pointerType !== 'mouse' || event.type === 'pointercancel') state.active = false;
      if (wasDragging && distance < 5 && event.type === 'pointerup' && Math.abs(state.x) < .35 && Math.abs(state.y) < .55) replayRef.current();
    };
    const leave = () => { if (!state.dragging) state.active = false; };
    const blur = () => { state.active = false; state.dragging = false; pointerId = null; node.classList.remove('is-dragging'); };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointerup', end);
    node.addEventListener('pointercancel', end);
    node.addEventListener('pointerleave', leave);
    window.addEventListener('blur', blur);
    return () => {
      node.removeEventListener('pointermove', move); node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointerup', end); node.removeEventListener('pointercancel', end);
      node.removeEventListener('pointerleave', leave); window.removeEventListener('blur', blur);
      blur();
    };
  }, [element, paused]);
  return field;
}
