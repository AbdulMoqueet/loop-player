import type { InputHTMLAttributes } from 'react';

interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  /** 0..1 fill fraction; defaults to derived from value/min/max. */
  fill?: number;
}

/** Range input styled from CSS with a themeable fill track. */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  fill,
  className = '',
  style,
  ...rest
}: SliderProps) {
  const pct = fill ?? (max > min ? (value - min) / (max - min) : 0);
  return (
    <input
      type="range"
      className={`ui-slider ${className}`.trim()}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onValueChange(parseFloat(e.target.value))}
      style={{ ['--fill' as string]: `${Math.round(pct * 100)}%`, ...style }}
      {...rest}
    />
  );
}
