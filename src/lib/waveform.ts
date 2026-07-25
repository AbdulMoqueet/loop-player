/** Per-bucket min/max amplitude pairs used to draw the waveform. */
export interface Peaks {
  /** Number of buckets. */
  length: number;
  /** Flat array of [min, max, min, max, ...] in the range [-1, 1]. */
  data: Float32Array;
}

/**
 * Downsample an AudioBuffer to `buckets` min/max amplitude pairs by merging
 * all channels. Cheap enough to run once per loaded file.
 */
export function computePeaks(buffer: AudioBuffer, buckets: number): Peaks {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const step = Math.max(1, Math.floor(frames / buckets));
  const data = new Float32Array(buckets * 2);

  const chans: Float32Array[] = [];
  for (let c = 0; c < channels; c++) chans.push(buffer.getChannelData(c));

  for (let b = 0; b < buckets; b++) {
    const start = b * step;
    const end = Math.min(start + step, frames);
    let min = 0;
    let max = 0;
    for (let i = start; i < end; i++) {
      // Average channels so stereo tracks render as one waveform.
      let sample = 0;
      for (let c = 0; c < channels; c++) sample += chans[c][i];
      sample /= channels;
      if (sample < min) min = sample;
      if (sample > max) max = sample;
    }
    data[b * 2] = min;
    data[b * 2 + 1] = max;
  }

  return { length: buckets, data };
}

/** Format seconds as m:ss (or h:mm:ss for long tracks). */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  return `${m}:${ss}`;
}

/**
 * Format seconds as m:ss.d — the extra tenth makes 1-second nudges of the
 * loop points visible even when the handles were dragged to a fraction.
 */
export function formatTimePrecise(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const tenths = Math.floor((seconds % 1) * 10);
  return `${formatTime(seconds)}.${tenths}`;
}
