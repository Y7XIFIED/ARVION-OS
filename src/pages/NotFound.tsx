import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const GOOFY_LINES = [
  'This page escaped into the matrix cafeteria.',
  'A duck unplugged this route by accident.',
  '404 means the page is on snack break.',
  'Signal lost. Vibes still strong.',
];

const STICKERS = ['BANANA', 'DUCK', 'BEEP', 'LOL', '404', 'HONK'];

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const [lineIndex, setLineIndex] = useState(0);
  const [bonkCount, setBonkCount] = useState(0);

  const stickerCloud = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        id: index,
        top: `${8 + ((index * 11) % 82)}%`,
        left: `${4 + ((index * 17) % 92)}%`,
        tilt: ((index * 23) % 30) - 15,
        label: STICKERS[index % STICKERS.length],
      })),
    []
  );

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-os-bg text-os-text font-mono crt">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgb(var(--os-primary-rgb)/0.2),transparent_45%),radial-gradient(circle_at_90%_78%,rgb(var(--os-primary-rgb)/0.14),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(var(--os-primary-rgb)/0.06)_1px,transparent_1px),linear-gradient(rgb(var(--os-primary-rgb)/0.05)_1px,transparent_1px)] bg-[size:22px_22px]" />

      {stickerCloud.map((sticker) => (
        <div
          key={sticker.id}
          className="absolute text-[10px] border border-os-border bg-os-panel/80 px-2 py-1 text-os-primary animate-bounce pointer-events-none"
          style={{ top: sticker.top, left: sticker.left, transform: `rotate(${sticker.tilt}deg)`, animationDelay: `${(sticker.id % 6) * 0.12}s` }}
        >
          {sticker.label}
        </div>
      ))}

      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl border-2 border-os-primary bg-os-panel/95 shadow-primary-glow p-6 text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-os-dim mb-2">GOOFY ERROR UNIT</div>
          <button
            type="button"
            onClick={() => setBonkCount((prev) => prev + 1)}
            className={`font-8bit text-7xl md:text-8xl text-os-primary text-shadow-glow mb-3 ${bonkCount % 2 === 1 ? 'animate-pulse' : ''}`}
          >
            404
          </button>
          <h1 className="text-2xl md:text-3xl font-8bit text-os-primary mb-2">PAGE NOT FOUND</h1>
          <p className="text-sm md:text-base text-os-text mb-4">{GOOFY_LINES[lineIndex]}</p>

          {bonkCount >= 4 && (
            <div className="mb-4 text-xs text-os-warning font-bold">
              You bonked the 404 sign {bonkCount} times. Respect.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-3 py-2 border border-os-primary bg-os-primary text-os-bg hover:bg-os-primaryHover"
            >
              RETURN HOME
            </button>
            <button
              type="button"
              onClick={() => setLineIndex((prev) => (prev + 1) % GOOFY_LINES.length)}
              className="px-3 py-2 border border-os-border hover:border-os-primary"
            >
              NEW EXCUSE
            </button>
            <button
              type="button"
              onClick={() => {
                setLineIndex(Math.floor(Math.random() * GOOFY_LINES.length));
                setBonkCount((prev) => prev + 1);
              }}
              className="px-3 py-2 border border-os-border hover:border-os-primary"
            >
              RANDOM CHAOS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
