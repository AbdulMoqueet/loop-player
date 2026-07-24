# 🔁 Loop Player — Free Online A–B Loop Audio Player for Music Practice

**Loop Player** is a free, open-source **A–B loop audio player** that runs
entirely in your browser. Load any local audio file (MP3, WAV, M4A, AAC, OGG),
drag two markers over the waveform, and **repeat any section of a song on
loop** — with **slow-down playback that preserves pitch**. Perfect for guitar
and piano practice, music transcription, ear training, and language learning
(shadowing).

**▶️ Try it now: [loop-player-moqueet.netlify.app](https://loop-player-moqueet.netlify.app)** — no sign-up, no upload, 100% private.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-build-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#license)

---

## Why Loop Player?

Ever wanted to **loop part of a song** to nail a fast solo, transcribe a
melody, or drill a tricky phrase in a foreign language? Loop Player gives you
a clean, distraction-free **audio looper** with a real waveform, so you can
see exactly what you're repeating — and slow it down **without the chipmunk
effect**.

- 🎸 **Guitar / bass / piano practice** — loop a riff or solo at 50% speed.
- 🎼 **Music transcription & ear training** — repeat short passages precisely.
- 🗣️ **Language learning** — shadow a sentence on repeat until it sticks.
- 🎧 **Dance choreography & drumming** — rehearse to the exact same section.

## Features

- **A–B looping** — drag the **A** (start) and **B** (end) handles on the
  waveform to define a loop region; playback repeats it seamlessly and always
  stays inside the loop.
- **Real waveform view** — the track is decoded and rendered with a
  highlighted loop region, live playhead, and a time ruler.
- **Slow down music without changing pitch (0.25×–4×)** — fine-tune with the
  slider or pick a preset from the speed dropdown. Pitch is preserved, so
  slowed-down audio still sounds in tune.
- **Remembers your last track** — reload the page and your song, loop points,
  speed, and volume come right back (stored locally in your browser via
  IndexedDB — nothing is uploaded).
- **Volume control with mute** — dedicated volume slider and one-click
  mute/unmute.
- **Track details at a glance** — format badge, average bitrate, and duration
  for the loaded file.
- **Live audio visualizer** — animated frequency bars driven by the Web Audio
  API.
- **Click-to-seek** — click anywhere on the waveform to jump.
- **Light & dark theme** — follows your device setting by default, with a
  manual toggle that's remembered across visits.
- **100% client-side & private** — no uploads, no backend, no account. Your
  audio never leaves your device.

## How it works

The player uses an `<audio>` element for playback, routed through the
**Web Audio API** (`AnalyserNode`) for the visualizer. The file is decoded once
with `decodeAudioData` to compute the static waveform peaks. Loop enforcement
runs on a `requestAnimationFrame` tick — when playback reaches point **B** (or
lands outside the region), it jumps back to point **A** — which keeps loops
tight and glitch-free. The last picked file is cached in **IndexedDB** and the
session settings in **localStorage**, so a reload restores everything.

## Getting started (run locally)

**Prerequisites:** [Node.js](https://nodejs.org/) 18+ and npm.

```bash
# Install dependencies
npm install

# Start the dev server (http://localhost:5173)
npm run dev

# Type-check and build for production
npm run build

# Preview the production build locally
npm run preview

# Lint
npm run lint
```

## Usage

1. Open the app and **drop an audio file** onto the page (or click to browse).
2. Press **Play**.
3. Drag the **A** and **B** handles across the waveform to set your loop.
4. Adjust the **speed** slider — or pick a preset from the `×` dropdown.
5. Set the **volume**, or click the speaker icon to mute.
6. Use the **sun/moon** button to switch themes.
7. Reload anytime — your track and settings are restored automatically.

## FAQ

**Is Loop Player free?**
Yes — free and open source (MIT). No ads, no account, no upload.

**Which audio formats are supported?**
Anything your browser can decode: MP3, WAV, M4A/AAC, OGG, and FLAC in most
modern browsers. Max file size is 100MB.

**Does slowing down the audio change the pitch?**
No. Playback speed uses the browser's `preservesPitch`, so a passage at 0.5×
stays in tune.

**Is my audio uploaded anywhere?**
Never. Decoding, looping, and storage all happen locally in your browser.

## Tech stack

- **[React 19](https://react.dev/)** + **[TypeScript](https://www.typescriptlang.org/)**
- **[Vite](https://vite.dev/)** for dev/build tooling
- **[Web Audio API](https://developer.mozilla.org/docs/Web/API/Web_Audio_API)**
  and **Canvas** for the waveform and visualizer
- **[Lucide](https://lucide.dev/)** icons
- **IndexedDB + localStorage** for offline persistence of the last track
- Plain CSS with custom properties for theming — no UI framework

## Project structure

```
src/
├── App.tsx                 # Composition + layout
├── hooks/
│   ├── useAudioEngine.ts   # Audio graph, playback, A→B loop, persistence
│   └── useTheme.ts         # System-aware, persisted theme
├── lib/
│   ├── waveform.ts         # Peak computation + time formatting
│   └── storage.ts          # IndexedDB (file) + localStorage (session)
└── components/
    ├── ui/                 # Reusable design-system primitives
    │   ├── Icon.tsx  Button.tsx  IconButton.tsx  Slider.tsx  Card.tsx
    ├── FileDrop.tsx        # Drag-and-drop / file picker + empty-state art
    ├── Waveform.tsx        # Canvas waveform + draggable A/B handles
    ├── Visualizer.tsx      # Animated frequency bars
    └── Controls.tsx        # Transport, speed, volume
```

## Browser support

Works in current versions of Chrome, Firefox, Safari, and Edge. Speed changes
rely on `preservesPitch` (with a WebKit-prefixed fallback) for in-tune
slow-downs.

## Keywords

`ab loop player` · `audio looper online` · `loop section of a song` ·
`slow down music without changing pitch` · `music practice tool` ·
`transcription player` · `language shadowing` · `waveform audio player` ·
`react web audio api`

## Author

Developed by **AbdulMoqueet**.

## Support / Donate ☕

If Loop Player helps your practice, you can support its development:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-thebravecoders-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/thebravecoders)

**→ [buymeacoffee.com/thebravecoders](https://buymeacoffee.com/thebravecoders)**

## License

MIT
