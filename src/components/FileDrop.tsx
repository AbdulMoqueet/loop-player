import { useRef, useState, type DragEvent } from "react";
import { Icon } from "./ui";

interface FileDropProps {
  onFile: (file: File) => void;
  loading?: boolean;
  error?: string | null;
}

/** Four-point curved sparkle centered at the origin; place with transform. */
const SPARKLE_D =
  "M0 -6 C1.2 -1.8 1.8 -1.2 6 0 C1.8 1.2 1.2 1.8 0 6 C-1.2 1.8 -1.8 1.2 -6 0 C-1.8 -1.2 -1.2 -1.8 0 -6 Z";

/** Decorative folder-with-music illustration for the empty state. */
function EmptyArt() {
  return (
    <svg
      className="empty__art"
      viewBox="0 0 240 150"
      fill="none"
      aria-hidden="true"
    >
      {/* Soft background blob */}
      <ellipse cx="120" cy="84" rx="94" ry="57" fill="var(--accent-bg)" />

      {/* Cloud */}
      <g fill="var(--surface-h)">
        <circle cx="46" cy="49" r="9" />
        <circle cx="58" cy="44" r="11" />
        <circle cx="70" cy="50" r="8" />
        <rect x="38" y="47" width="40" height="11" rx="5.5" />
      </g>

      {/* Leaves */}
      <g fill="var(--accent)" opacity="0.4">
        <path d="M46 98c-7 1-11 6-12 13 7-1 11-6 12-13z" />
        <path d="M37 112c-6-3-12-2-17 2 5 4 12 4 17-2z" />
        <path d="M194 98c7 1 11 6 12 13-7-1-11-6-12-13z" />
        <path d="M203 112c6-3 12-2 17 2-5 4-12 4-17-2z" />
      </g>
      <g
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      >
        <path d="M32 126c8-3 13-9 14-17" />
        <path d="M208 126c-8-3-13-9-14-17" />
      </g>

      {/* Dashed file drifting into the folder */}
      <g transform="rotate(10 174 40)">
        <rect
          x="152"
          y="14"
          width="44"
          height="52"
          rx="10"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeDasharray="7 6"
          strokeLinecap="round"
        />
        <g stroke="var(--accent)" strokeWidth="2.4" strokeLinejoin="round">
          <path d="M167 48V33l15-2.6V44" strokeLinecap="round" />
          <circle cx="163.4" cy="48" r="3.6" />
          <circle cx="178.4" cy="44" r="3.6" />
        </g>
      </g>

      {/* Folder */}
      <g>
        {/* Back flap with tab */}
        <path
          d="M68 92V74a10 10 0 0 1 10-10h27l11 12h46a10 10 0 0 1 10 10v6H68z"
          fill="var(--accent)"
          opacity="0.4"
        />
        {/* Front body */}
        <rect
          x="62"
          y="80"
          width="116"
          height="52"
          rx="11"
          fill="var(--accent)"
        />
        {/* Beamed note on the folder */}
        <g strokeLinejoin="round">
          <path
            d="M113 114V93l24-4v21"
            stroke="#fff"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="109" cy="114" r="5.5" fill="#fff" />
          <circle cx="133.5" cy="110" r="5.5" fill="#fff" />
        </g>
      </g>

      {/* Sparkles */}
      <g fill="var(--accent)">
        <path d={SPARKLE_D} transform="translate(210 60)" />
        <path d={SPARKLE_D} transform="translate(146 14) scale(0.75)" />
        <path d={SPARKLE_D} transform="translate(32 74) scale(0.65)" />
        <circle cx="222" cy="28" r="2.8" />
        <circle cx="72" cy="20" r="2.2" />
      </g>
    </svg>
  );
}

/** Empty state hero: illustration, copy, and a drag-and-drop / browse zone. */
export function FileDrop({ onFile, loading, error }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file); // let the decoder decide for odd MIME types
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files);
  };

  return (
    <div
      className={`empty ${dragging ? "empty--over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <EmptyArt />

      <h2 className="empty__title">
        {loading ? "Decoding audio…" : "No audio selected"}
      </h2>
      <p className="empty__sub">
        {loading
          ? "Building the waveform"
          : "Choose an audio file to get started with A→B looping."}
      </p>

      <button
        className="empty__drop"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        <span className="empty__drop-icon">
          <Icon name={loading ? "music" : "upload"} size={20} />
        </span>
        <span className="empty__drop-text">
          <b>Drag &amp; drop</b> an audio file here
          <br />
          or click to <span className="empty__browse">browse</span>
        </span>
      </button>

      {error && <p className="empty__error">{error}</p>}

      <p className="empty__formats">
        Supports MP3, WAV, M4A, AAC, OGG&ensp;•&ensp;Max size: 100MB
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => pick(e.target.files)}
      />
    </div>
  );
}
