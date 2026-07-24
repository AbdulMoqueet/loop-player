import { useCallback } from 'react';
import './App.css';
import './components/ui/ui.css';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useTheme } from './hooks/useTheme';
import { formatTime } from './lib/waveform';
import { Card, Icon, IconButton } from './components/ui';
import { FileDrop } from './components/FileDrop';
import { Waveform } from './components/Waveform';
import { Visualizer } from './components/Visualizer';
import { Controls } from './components/Controls';

function App() {
  const engine = useAudioEngine();
  const { theme, toggle: toggleTheme } = useTheme();

  const {
    track,
    isPlaying,
    currentTime,
    duration,
    speed,
    volume,
    muted,
    pointA,
    pointB,
    loading,
    error,
    analyser,
    loadFile,
    toggle,
    seek,
    setSpeed,
    setVolume,
    toggleMute,
    setPointA,
    setPointB,
  } = engine;

  const resetLoop = useCallback(() => {
    setPointA(0);
    setPointB(duration);
  }, [duration, setPointA, setPointB]);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo">
            <Icon name="loop" size={20} />
          </span>
          <div>
            <h1 className="app__title">Loop Player</h1>
            <p className="app__subtitle">A→B looping for practice</p>
          </div>
        </div>
        <IconButton
          icon={theme === 'dark' ? 'sun' : 'moon'}
          label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          variant="ghost"
          onClick={toggleTheme}
        />
      </header>

      <main className="app__main">
        <Card className="player">
          {!track ? (
            <FileDrop onFile={loadFile} loading={loading} error={error} />
          ) : (
            <>
              <div className="player__meta">
                <span className="player__badge">
                  <Icon name="music" size={22} />
                </span>
                <div className="player__info">
                  <span className="player__name" title={track.name}>
                    {track.name}
                  </span>
                  <div className="player__details">
                    <span className="player__format">{track.format}</span>
                    {track.bitrateKbps !== null && (
                      <>
                        <span className="player__dot">•</span>
                        <span className="player__detail">
                          <Icon name="zap" size={13} /> {track.bitrateKbps} kbps
                        </span>
                      </>
                    )}
                    <span className="player__dot">•</span>
                    <span className="player__detail">
                      <Icon name="clock" size={13} /> {formatTime(duration)}
                    </span>
                  </div>
                </div>
                <label className="player__replace">
                  <Icon name="pencil" size={14} /> Change
                  <input
                    type="file"
                    accept="audio/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void loadFile(f);
                    }}
                  />
                </label>
              </div>

              <div className="player__divider" />

              <Visualizer analyser={analyser} isPlaying={isPlaying} />

              <Waveform
                peaks={track.peaks}
                duration={duration}
                currentTime={currentTime}
                pointA={pointA}
                pointB={pointB}
                onSeek={seek}
                onChangeA={setPointA}
                onChangeB={setPointB}
              />
            </>
          )}

          <Controls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            speed={speed}
            volume={volume}
            muted={muted}
            pointA={pointA}
            pointB={pointB}
            disabled={!track}
            onToggle={toggle}
            onSpeed={setSpeed}
            onVolume={setVolume}
            onToggleMute={toggleMute}
            onResetLoop={resetLoop}
          />
        </Card>
      </main>

      <footer className="app__footer">
        {track && (
          <p className="app__hint">
            Drag the <b>A</b> and <b>B</b> handles to set your loop.
          </p>
        )}
        <div className="app__credits">
          <span>
            Developed by <strong>AbdulMoqueet</strong>
          </span>
          <span className="app__credits-sep">•</span>
          <span>Support / Donate:</span>
          <a
            className="app__coffee"
            href="https://buymeacoffee.com/thebravecoders"
            target="_blank"
            rel="noreferrer"
          >
            ☕ Buy Me a Coffee
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
