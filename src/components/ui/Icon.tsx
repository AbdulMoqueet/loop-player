import type { LucideIcon } from 'lucide-react';
import {
  AudioLines,
  ChevronDown,
  Clock,
  Moon,
  Music,
  Pause,
  Pencil,
  Play,
  Repeat2,
  RotateCcw,
  Sun,
  Upload,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';

export type IconName =
  | 'play'
  | 'pause'
  | 'sun'
  | 'moon'
  | 'upload'
  | 'music'
  | 'loop'
  | 'reset'
  | 'gauge'
  | 'pencil'
  | 'volume'
  | 'volume-mute'
  | 'chevron'
  | 'clock'
  | 'bars'
  | 'zap';

const ICONS: Record<IconName, LucideIcon> = {
  play: Play,
  pause: Pause,
  sun: Sun,
  moon: Moon,
  upload: Upload,
  music: Music,
  loop: Repeat2,
  reset: RotateCcw,
  gauge: AudioLines,
  pencil: Pencil,
  volume: Volume2,
  'volume-mute': VolumeX,
  chevron: ChevronDown,
  clock: Clock,
  bars: AudioLines,
  zap: Zap,
};

// Play/pause read better solid at button sizes; the rest stay as line icons.
const FILLED: Partial<Record<IconName, boolean>> = { play: true, pause: true };

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 20, className }: IconProps) {
  const Cmp = ICONS[name];
  return (
    <Cmp
      size={size}
      strokeWidth={1.8}
      fill={FILLED[name] ? 'currentColor' : 'none'}
      aria-hidden="true"
      className={className}
    />
  );
}
