import { useEffect, useRef, type RefObject } from 'react';

interface VisualizerProps {
  analyser: RefObject<AnalyserNode | null>;
  isPlaying: boolean;
}

function cssVar(el: HTMLElement, name: string, fallback: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

/** Symmetric animated frequency bars driven by the AnalyserNode. */
export function Visualizer({ analyser, isPlaying }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const smoothRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const BARS = 48;
    const freq = new Uint8Array(128);

    const render = () => {
      const node = analyser.current;
      const accent = cssVar(canvas, '--accent', '#a06bff');
      const accent2 = cssVar(canvas, '--accent-2', '#5ad1ff');

      if (node && isPlaying) node.getByteFrequencyData(freq);
      else freq.fill(0);

      ctx.clearRect(0, 0, w, h);
      const gap = 3;
      const barW = (w - gap * (BARS - 1)) / BARS;
      const mid = h / 2;

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, accent);
      grad.addColorStop(1, accent2);
      ctx.fillStyle = grad;

      if (smoothRef.current.length !== BARS)
        smoothRef.current = new Array(BARS).fill(0);

      for (let i = 0; i < BARS; i++) {
        // Sample from the low-mid part of the spectrum where music lives.
        const srcIdx = Math.floor((i / BARS) * 90) + 2;
        const target = freq[srcIdx] / 255;
        // Ease toward the target for a smooth idle-to-active transition.
        const prev = smoothRef.current[i];
        const eased = prev + (target - prev) * 0.35;
        smoothRef.current[i] = eased;

        const idle = 0.04; // small resting height when paused
        const amp = Math.max(idle, eased);
        const barH = amp * (h * 0.9);
        const x = i * (barW + gap);
        const r = Math.min(barW / 2, 3);
        roundRect(ctx, x, mid - barH / 2, barW, barH, r);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isPlaying]);

  return <canvas ref={canvasRef} className="visualizer" />;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
