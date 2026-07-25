import type { KeyboardEvent } from 'react';
import { formatTime, formatTimePrecise } from '../lib/waveform';
import { MIN_LOOP_GAP } from '../hooks/useAudioEngine';
import { Button, Icon, IconButton, Slider } from './ui';

interface ControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  volume: number;
  muted: boolean;
  pointA: number;
  pointB: number;
  /** Completed passes through the current A→B region. */
  loopCount: number;
  /** True when no track is loaded — transport buttons are disabled. */
  disabled?: boolean;
  onToggle: () => void;
  onSpeed: (v: number) => void;
  onVolume: (v: number) => void;
  onToggleMute: () => void;
  onChangeA: (t: number) => void;
  onChangeB: (t: number) => void;
  onRestart: () => void;
  onResetLoop: () => void;
  onResetCount: () => void;
}

const SPEED_MIN = 0.25;
const SPEED_MAX = 4;
/** Every quarter step from 0.25× to 4×. */
const SPEED_PRESETS = Array.from({ length: 16 }, (_, i) => (i + 1) * 0.25);
/** Seconds moved per arrow press on a loop point. */
const NUDGE = 1;
/** Finer step for Shift + arrow key. */
const NUDGE_FINE = 0.1;

interface LoopPointProps {
  name: 'A' | 'B';
  time: number;
  disabled: boolean;
  /** Lower / upper bound this point may be nudged to. */
  min: number;
  max: number;
  onChange: (t: number) => void;
}

/** One loop bound with ◂ / ▸ arrows that step it by exactly one second. */
function LoopPoint({ name, time, disabled, min, max, onChange }: LoopPointProps) {
  // Keydown on the wrapper also catches arrows bubbling from the focused nudge
  // buttons, so you can click one and then keep stepping from the keyboard.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const dir = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    if (dir === 0) return;
    e.preventDefault();
    e.stopPropagation();
    onChange(time + dir * (e.shiftKey ? NUDGE_FINE : NUDGE));
  };

  return (
    <div
      className={`loop-point loop-point--${name.toLowerCase()}`}
      onKeyDown={onKeyDown}
    >
      <span className="loop-point__tag">{name}</span>
      <IconButton
        icon="nudge-back"
        label={`Move ${name} back 1 second`}
        variant="ghost"
        size="sm"
        onClick={() => onChange(time - NUDGE)}
        disabled={disabled || time <= min}
      />
      <span className="loop-point__time">{formatTimePrecise(time)}</span>
      <IconButton
        icon="nudge-fwd"
        label={`Move ${name} forward 1 second`}
        variant="ghost"
        size="sm"
        onClick={() => onChange(time + NUDGE)}
        disabled={disabled || time >= max}
      />
    </div>
  );
}

export function Controls({
  isPlaying,
  currentTime,
  duration,
  speed,
  volume,
  muted,
  pointA,
  pointB,
  loopCount,
  disabled = false,
  onToggle,
  onSpeed,
  onVolume,
  onToggleMute,
  onChangeA,
  onChangeB,
  onRestart,
  onResetLoop,
  onResetCount,
}: ControlsProps) {
  // Slider is linear in value; snapping to 1.00 within a small window makes
  // it easy to land on normal speed.
  const handleSpeed = (v: number) => {
    onSpeed(Math.abs(v - 1) < 0.06 ? 1 : v);
  };

  // A nudge is a deliberate edit, so it always re-arms the loop from A.
  const nudgeA = (t: number) => {
    onChangeA(t);
    onRestart();
  };
  const nudgeB = (t: number) => {
    onChangeB(t);
    onRestart();
  };

  const effectiveVolume = muted ? 0 : volume;
  const speedOptions = SPEED_PRESETS.includes(speed)
    ? SPEED_PRESETS
    : [...SPEED_PRESETS, speed].sort((a, b) => a - b);

  return (
    <div className="controls">
      <div className="controls__transport">
        <IconButton
          icon={isPlaying ? 'pause' : 'play'}
          label={isPlaying ? 'Pause' : 'Play'}
          variant="primary"
          size="lg"
          onClick={onToggle}
          disabled={disabled}
        />

        <div className="controls__time">
          <span className="controls__time-cur">{formatTime(currentTime)}</span>
          <span className="controls__time-sep">/</span>
          <span className="controls__time-dur">{formatTime(duration)}</span>
        </div>

        <div className="controls__spacer" />

        <div className="controls__volume">
          <IconButton
            icon={effectiveVolume === 0 ? 'volume-mute' : 'volume'}
            label={muted ? 'Unmute' : 'Mute'}
            variant="ghost"
            size="sm"
            onClick={onToggleMute}
          />
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={effectiveVolume}
            onValueChange={onVolume}
            className="controls__volume-slider"
            aria-label="Volume"
          />
          <span className="controls__volume-val">
            {Math.round(effectiveVolume * 100)}%
          </span>
        </div>
      </div>

      <div className="controls__loop">
        <span className="controls__loop-icon">
          <Icon name="loop" size={16} />
        </span>
        <LoopPoint
          name="A"
          time={pointA}
          disabled={disabled}
          min={0}
          max={pointB - MIN_LOOP_GAP}
          onChange={nudgeA}
        />
        <span className="controls__loop-arrow" aria-hidden="true">
          →
        </span>
        <LoopPoint
          name="B"
          time={pointB}
          disabled={disabled}
          min={pointA + MIN_LOOP_GAP}
          max={duration}
          onChange={nudgeB}
        />

        <button
          type="button"
          className="loop-count"
          onClick={onResetCount}
          disabled={disabled}
          title="Completed loops — click to reset the count"
        >
          <span className="loop-count__num">{loopCount}</span>
          <span className="loop-count__label">
            {loopCount === 1 ? 'loop' : 'loops'}
          </span>
        </button>

        <div className="controls__spacer" />

        <Button
          variant="surface"
          size="md"
          onClick={onRestart}
          disabled={disabled || pointB <= pointA}
          title="Jump the playhead back to A"
        >
          <Icon name="restart" size={15} /> Restart
        </Button>
        <Button variant="surface" size="md" onClick={onResetLoop} disabled={disabled}>
          <Icon name="reset" size={15} /> Reset
        </Button>
      </div>

      <div className="controls__speed">
        <span className="controls__speed-icon">
          <Icon name="bars" size={18} />
        </span>
        <Slider
          min={SPEED_MIN}
          max={SPEED_MAX}
          step={0.05}
          value={speed}
          onValueChange={handleSpeed}
          aria-label="Playback speed"
        />
        <span className="controls__speed-val" title="Playback speed">
          {speed.toFixed(2)}×
          <Icon name="chevron" size={14} />
          <select
            className="controls__speed-select"
            value={String(speed)}
            onChange={(e) => onSpeed(parseFloat(e.target.value))}
            aria-label="Playback speed preset"
          >
            {speedOptions.map((v) => (
              <option key={v} value={String(v)}>
                {v.toFixed(2)}×
              </option>
            ))}
          </select>
        </span>
      </div>
    </div>
  );
}
