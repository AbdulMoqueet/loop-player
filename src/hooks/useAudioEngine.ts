import { useCallback, useEffect, useRef, useState } from 'react';
import { computePeaks, type Peaks } from '../lib/waveform';
import {
  clearLastFile,
  loadLastFile,
  loadSession,
  saveLastFile,
  saveSession,
} from '../lib/storage';

const WAVEFORM_BUCKETS = 1400;
const MAX_FILE_BYTES = 100 * 1024 * 1024;

/** Smallest allowed A→B region, in seconds. */
export const MIN_LOOP_GAP = 0.2;

export interface Track {
  name: string;
  url: string;
  peaks: Peaks;
  /** Uppercase file extension, e.g. "MP3". */
  format: string;
  /** Average bitrate derived from file size / duration; null if unknown. */
  bitrateKbps: number | null;
}

interface AudioElementWithPitch extends HTMLAudioElement {
  webkitPreservesPitch?: boolean;
}

/**
 * Owns the audio graph: an <audio> element routed through an AnalyserNode for
 * the visualizer, plus the A→B loop enforcement driven by requestAnimationFrame.
 */
export function useAudioEngine() {
  const audioRef = useRef<AudioElementWithPitch | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const [track, setTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);
  const [pointA, setPointAState] = useState(0);
  const [pointB, setPointBState] = useState(0);
  const [loopCount, setLoopCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the loop bounds and duration in refs so the rAF tick and the loop
  // editors read fresh values without re-creating callbacks.
  const aRef = useRef(0);
  const bRef = useRef(0);
  const durRef = useRef(0);
  /** Value of A the playhead was last sent back to; -1 means "not anchored". */
  const anchorRef = useRef(-1);
  const loopCountRef = useRef(0);

  // Completed passes are counted off the rAF tick and the 'ended' handler, so
  // the running total lives in a ref and is mirrored into state for rendering.
  const countLoop = useCallback(() => {
    loopCountRef.current += 1;
    setLoopCount(loopCountRef.current);
  }, []);

  /** Editing the region starts a new practice run, so the tally goes back to 0. */
  const resetLoopCount = useCallback(() => {
    loopCountRef.current = 0;
    setLoopCount(0);
  }, []);
  useEffect(() => {
    aRef.current = pointA;
    bRef.current = pointB;
    durRef.current = duration;
  }, [pointA, pointB, duration]);

  // Create the <audio> element and audio graph once.
  useEffect(() => {
    const audio = new Audio() as AudioElementWithPitch;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const onLoaded = () => setDuration(audio.duration || 0);
    // With B at the very end of the track, 'ended' fires before the tick can
    // wrap the playhead — so close the loop here instead of stopping.
    const onEnded = () => {
      const a = aRef.current;
      if (bRef.current > a) {
        // The tick can wrap the playhead in the same frame the element ends;
        // if it already did, this pass has been counted.
        if (Math.abs(audio.currentTime - a) > 0.05) countLoop();
        audio.currentTime = a;
        anchorRef.current = a;
        void audio.play().catch(() => {});
        return;
      }
      setIsPlaying(false);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [countLoop]);

  // Lazily build the Web Audio graph (needs a user gesture to start).
  const ensureGraph = useCallback(() => {
    if (ctxRef.current || !audioRef.current) return;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const source = ctx.createMediaElementSource(audioRef.current);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    ctxRef.current = ctx;
    analyserRef.current = analyser;
  }, []);

  // The playback tick: mirror currentTime into state and enforce A→B.
  useEffect(() => {
    const tick = () => {
      const audio = audioRef.current;
      if (audio) {
        const t = audio.currentTime;
        const a = aRef.current;
        const b = bRef.current;
        // While playing, keep the playhead inside the A→B region — reaching B
        // or landing before A (seek, handle drag) jumps back to A. Paused
        // scrubbing stays free so the user can preview anywhere.
        if (!audio.paused && b > a && (t >= b || t < a)) {
          // Reaching B is a completed pass; landing before A is a seek or a
          // handle drag, which shouldn't inflate the tally.
          if (t >= b) countLoop();
          audio.currentTime = a;
          anchorRef.current = a;
          setCurrentTime(a);
        } else {
          setCurrentTime(t);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [countLoop]);

  const loadFileCore = useCallback(async (file: File, restoring: boolean) => {
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError('That file is too large — the maximum size is 100MB.');
      return;
    }
    setLoading(true);
    try {
      const arrayBuf = await file.arrayBuffer();
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      // A throwaway context just for decoding peaks.
      const decodeCtx = new Ctx();
      const audioBuffer = await decodeCtx.decodeAudioData(arrayBuf.slice(0));
      decodeCtx.close();

      const peaks = computePeaks(audioBuffer, WAVEFORM_BUCKETS);
      const url = URL.createObjectURL(file);
      const dur = audioBuffer.duration;

      const audio = audioRef.current!;
      audio.src = url;
      audio.load();

      const dotIdx = file.name.lastIndexOf('.');
      const ext = dotIdx > 0 ? file.name.slice(dotIdx + 1) : '';
      const format =
        ext.length > 0 && ext.length <= 5
          ? ext.toUpperCase()
          : (file.type.split('/')[1] || 'audio').toUpperCase();
      const bitrateKbps = dur > 0 ? Math.round((file.size * 8) / dur / 1000) : null;

      setTrack((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { name: file.name, url, peaks, format, bitrateKbps };
      });
      setDuration(dur);
      setCurrentTime(0);
      setIsPlaying(false);
      anchorRef.current = -1;
      resetLoopCount();

      // Restore the previous session's loop/speed/volume for this track, or
      // default the loop to the whole track. The name check means this applies
      // whether the file came back from IndexedDB or the user re-picked it.
      const saved = loadSession();
      if (saved && saved.name === file.name && saved.pointB > saved.pointA) {
        const clamp = (v: number) => Math.max(0, Math.min(dur, v));
        setPointAState(clamp(saved.pointA));
        setPointBState(clamp(saved.pointB));
        aRef.current = clamp(saved.pointA);
        bRef.current = clamp(saved.pointB);
        setSpeedState(saved.speed);
        setVolumeState(saved.volume);
        setMuted(saved.muted);
        audio.playbackRate = saved.speed;
        audio.preservesPitch = true;
        audio.webkitPreservesPitch = true;
        audio.volume = saved.volume;
        audio.muted = saved.muted;
        audio.currentTime = clamp(saved.pointA);
        setCurrentTime(clamp(saved.pointA));
      } else {
        setPointAState(0);
        setPointBState(dur);
        aRef.current = 0;
        bRef.current = dur;
      }
      durRef.current = dur;

      // Remember a freshly picked file so a reload brings it back.
      if (!restoring) void saveLastFile(file).catch(() => {});
    } catch {
      if (restoring) {
        // A stale/undecodable stored file: drop it silently.
        void clearLastFile().catch(() => {});
      } else {
        setError('Could not decode that file. Try a different audio file.');
      }
    } finally {
      setLoading(false);
    }
  }, [resetLoopCount]);

  const loadFile = useCallback(
    (file: File) => loadFileCore(file, false),
    [loadFileCore],
  );

  // On mount, bring back the last picked track from IndexedDB.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const file = await loadLastFile().catch(() => null);
      if (file && !cancelled) await loadFileCore(file, true);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFileCore]);

  // Persist session settings whenever they change.
  useEffect(() => {
    if (!track || duration <= 0) return;
    saveSession({ name: track.name, pointA, pointB, speed, volume, muted });
  }, [track, duration, pointA, pointB, speed, volume, muted]);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    ensureGraph();
    if (ctxRef.current?.state === 'suspended') await ctxRef.current.resume();
    // If the playhead is outside the A→B region, start from A.
    const a = aRef.current;
    const b = bRef.current;
    if (b > a && (audio.currentTime >= b || audio.currentTime < a)) {
      audio.currentTime = a;
      setCurrentTime(a);
    }
    try {
      await audio.play();
    } catch {
      /* interrupted play() — ignore */
    }
  }, [ensureGraph]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else void play();
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(time, audio.duration || time));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  /**
   * Send the playhead back to A. `force` is for explicit user actions; the
   * unforced form is used while a handle is being dragged, where it fires on
   * every pointer move and each redundant seek would restart decoding and
   * stutter the audio.
   */
  const jumpToA = useCallback((force: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;
    const a = aRef.current;
    if (!force && anchorRef.current === a) {
      const t = audio.currentTime;
      // Already parked at A (paused) or running inside the region: leave it be.
      if (audio.paused ? Math.abs(t - a) < 0.01 : t >= a && t < bRef.current) return;
    }
    anchorRef.current = a;
    audio.currentTime = a;
    setCurrentTime(a);
  }, []);

  const restart = useCallback(() => jumpToA(true), [jumpToA]);

  // Moving either handle re-arms the loop from A, so the next thing you hear
  // is always the region you just edited.
  const setPointA = useCallback(
    (time: number) => {
      const next = Math.max(0, Math.min(time, bRef.current - MIN_LOOP_GAP));
      if (next === aRef.current) return;
      aRef.current = next;
      setPointAState(next);
      resetLoopCount();
      jumpToA(false);
    },
    [jumpToA, resetLoopCount],
  );

  const setPointB = useCallback(
    (time: number) => {
      const max = durRef.current || audioRef.current?.duration || time;
      const next = Math.max(aRef.current + MIN_LOOP_GAP, Math.min(time, max));
      if (next === bRef.current) return;
      bRef.current = next;
      setPointBState(next);
      resetLoopCount();
      jumpToA(false);
    },
    [jumpToA, resetLoopCount],
  );

  /** Widen the loop back out to the whole track. */
  const resetLoop = useCallback(() => {
    const dur = durRef.current || audioRef.current?.duration || 0;
    aRef.current = 0;
    bRef.current = dur;
    setPointAState(0);
    setPointBState(dur);
    resetLoopCount();
    restart();
  }, [restart, resetLoopCount]);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVolumeState(clamped);
    // Dragging the slider always unmutes so the change is audible.
    setMuted(false);
    const audio = audioRef.current;
    if (audio) {
      audio.volume = clamped;
      audio.muted = false;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  }, []);

  const setSpeed = useCallback((value: number) => {
    const audio = audioRef.current;
    setSpeedState(value);
    if (audio) {
      audio.playbackRate = value;
      // Preserve pitch when slowing/speeding — better for music practice.
      audio.preservesPitch = true;
      audio.webkitPreservesPitch = true;
    }
  }, []);

  return {
    track,
    isPlaying,
    currentTime,
    duration,
    speed,
    volume,
    muted,
    pointA,
    pointB,
    loopCount,
    loading,
    error,
    analyser: analyserRef,
    loadFile,
    play,
    pause,
    toggle,
    seek,
    restart,
    setSpeed,
    setVolume,
    toggleMute,
    setPointA,
    setPointB,
    resetLoop,
    resetLoopCount,
  };
}

export type AudioEngine = ReturnType<typeof useAudioEngine>;
