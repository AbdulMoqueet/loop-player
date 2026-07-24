import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import { formatTime, type Peaks } from '../lib/waveform';

interface WaveformProps {
  peaks: Peaks;
  duration: number;
  currentTime: number;
  pointA: number;
  pointB: number;
  onSeek: (time: number) => void;
  onChangeA: (time: number) => void;
  onChangeB: (time: number) => void;
}

const MIN_GAP = 0.2; // seconds between A and B

/** Pick a tick interval so ruler labels never crowd at the current width. */
function timeTicks(duration: number, width: number): number[] {
  if (duration <= 0) return [];
  // ~70px of horizontal room per label keeps them readable on any screen.
  const maxLabels = Math.min(8, Math.max(3, Math.floor(width / 70)));
  const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200];
  const step = steps.find((s) => duration / s <= maxLabels) ?? 1800;
  const ticks: number[] = [];
  // Stop early enough that the last tick doesn't collide with the end label.
  for (let t = 0; t <= duration - step * 0.6; t += step) ticks.push(t);
  return ticks;
}

function cssVar(el: HTMLElement, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

export function Waveform({
  peaks,
  duration,
  currentTime,
  pointA,
  pointB,
  onSeek,
  onChangeA,
  onChangeB,
}: WaveformProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<'A' | 'B' | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const [wrapWidth, setWrapWidth] = useState(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;

    const waveColor = cssVar(wrap, '--wave') || '#454a5c';
    const playedColor = cssVar(wrap, '--wave-played') || '#a06bff';
    const dimColor = cssVar(wrap, '--text-faint') || '#6b7180';

    ctx.clearRect(0, 0, w, h);

    const mid = h / 2;
    const n = peaks.length;
    const barW = w / n;
    const playedX = duration > 0 ? (currentTime / duration) * w : 0;
    const aX = duration > 0 ? (pointA / duration) * w : 0;
    const bX = duration > 0 ? (pointB / duration) * w : w;

    for (let i = 0; i < n; i++) {
      const min = peaks.data[i * 2];
      const max = peaks.data[i * 2 + 1];
      const x = i * barW;
      const inRegion = x >= aX && x <= bX;
      // Played portion uses accent; outside the loop region is dimmed.
      if (x <= playedX) ctx.fillStyle = playedColor;
      else ctx.fillStyle = inRegion ? waveColor : dimColor;
      const yTop = mid + max * mid * 0.92;
      const yBot = mid + min * mid * 0.92;
      const barH = Math.max(1, yTop - yBot);
      ctx.globalAlpha = inRegion ? 1 : 0.4;
      ctx.fillRect(x, h - yTop, Math.max(1, barW - 0.5), barH);
    }
    ctx.globalAlpha = 1;
  }, [peaks, duration, currentTime, pointA, pointB]);

  // Size the canvas to its container (devicePixelRatio aware) and redraw.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { w: rect.width, h: rect.height };
      setWrapWidth(rect.width);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  const timeFromEvent = (clientX: number): number => {
    const wrap = wrapRef.current;
    if (!wrap || duration <= 0) return 0;
    const rect = wrap.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return frac * duration;
  };

  const onHandleDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const which = e.currentTarget.dataset.handle as 'A' | 'B';
    dragRef.current = which;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const which = dragRef.current;
    if (!which) return;
    const t = timeFromEvent(e.clientX);
    if (which === 'A') onChangeA(Math.min(t, pointB - MIN_GAP));
    else onChangeB(Math.max(t, pointA + MIN_GAP));
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      dragRef.current = null;
    }
  };

  const onTrackClick = (e: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) return;
    onSeek(timeFromEvent(e.clientX));
  };

  const pct = (t: number) => (duration > 0 ? (t / duration) * 100 : 0);
  const ticks = useMemo(() => timeTicks(duration, wrapWidth), [duration, wrapWidth]);

  return (
    <div className="waveform-wrap">
      <div
        className="waveform"
        ref={wrapRef}
        onPointerDown={onTrackClick}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <canvas ref={canvasRef} className="waveform__canvas" />

        {/* Loop region highlight */}
        <div
          className="waveform__region"
          style={{ left: `${pct(pointA)}%`, right: `${100 - pct(pointB)}%` }}
        />

        {/* Playhead */}
        <div className="waveform__playhead" style={{ left: `${pct(currentTime)}%` }} />

        {/* A / B handles */}
        <div
          className="waveform__handle waveform__handle--a"
          style={{ left: `${pct(pointA)}%` }}
          data-handle="A"
          onPointerDown={onHandleDown}
          role="slider"
          aria-label="Loop start (A)"
          aria-valuenow={Math.round(pointA)}
          tabIndex={0}
        >
          <span className="waveform__flag">A</span>
        </div>
        <div
          className="waveform__handle waveform__handle--b"
          style={{ left: `${pct(pointB)}%` }}
          data-handle="B"
          onPointerDown={onHandleDown}
          role="slider"
          aria-label="Loop end (B)"
          aria-valuenow={Math.round(pointB)}
          tabIndex={0}
        >
          <span className="waveform__flag">B</span>
        </div>
      </div>

      {/* Time ruler under the waveform */}
      <div className="waveform__times" aria-hidden="true">
        {ticks.map((t) => (
          <span
            key={t}
            className="waveform__tick"
            style={t === 0 ? { left: 0 } : { left: `${pct(t)}%`, transform: 'translateX(-50%)' }}
          >
            {formatTime(t)}
          </span>
        ))}
        <span className="waveform__tick waveform__tick--end">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
