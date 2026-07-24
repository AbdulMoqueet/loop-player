import { formatTime } from '../lib/waveform';
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
  /** True when no track is loaded — transport buttons are disabled. */
  disabled?: boolean;
  onToggle: () => void;
  onSpeed: (v: number) => void;
  onVolume: (v: number) => void;
  onToggleMute: () => void;
  onResetLoop: () => void;
}

const SPEED_MIN = 0.25;
const SPEED_MAX = 4;
const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export function Controls({
  isPlaying,
  currentTime,
  duration,
  speed,
  volume,
  muted,
  pointA,
  pointB,
  disabled = false,
  onToggle,
  onSpeed,
  onVolume,
  onToggleMute,
  onResetLoop,
}: ControlsProps) {
  // Slider is linear in value; snapping to 1.00 within a small window makes
  // it easy to land on normal speed.
  const handleSpeed = (v: number) => {
    onSpeed(Math.abs(v - 1) < 0.06 ? 1 : v);
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

        <div className="controls__loop">
          <Icon name="loop" size={16} />
          <span>
            {duration > 0
              ? `${formatTime(pointA)} → ${formatTime(pointB)}`
              : 'A → B Loop'}
          </span>
        </div>

        <Button variant="surface" size="md" onClick={onResetLoop} disabled={disabled}>
          <Icon name="reset" size={15} /> Reset
        </Button>

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
