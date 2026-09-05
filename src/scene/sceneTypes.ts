export type SceneMetrics = { renderer: 'Canvas 2D' | 'WebGL'; fps: number; particles: number; frame: number; rotation: number; intro: number; paintMs?: number };
export type SceneProps = {
  paused: boolean; visible: boolean; replay: number; epoch: number;
  onReady: () => void; onError: () => void; onReplay: () => void;
  onMetrics?: (metrics: SceneMetrics) => void;
};
