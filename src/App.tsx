import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BootSequence } from './components/BootSequence';
import { Desktop } from './components/Desktop';
import { NotFound } from './pages/NotFound';
import { CustomCursor } from './components/CustomCursor';

type PowerState = 'booting' | 'running' | 'off';

function MainApp() {
  const [powerState, setPowerState] = useState<PowerState>('booting');
  const DEFAULT_ACCENT = '#00BFA6';

  useEffect(() => {
    const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
    const hexToRgb = (hex: string): [number, number, number] => {
      const normalized = hex.replace('#', '').trim();
      if (normalized.length !== 6) return [0, 191, 166];
      const parsed = Number.parseInt(normalized, 16);
      if (Number.isNaN(parsed)) return [0, 191, 166];
      return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
    };
    const add = (rgb: [number, number, number], offset: [number, number, number]): [number, number, number] => [
      clamp(rgb[0] + offset[0]),
      clamp(rgb[1] + offset[1]),
      clamp(rgb[2] + offset[2]),
    ];
    const makeSurface = (accentRgb: [number, number, number]) => {
      const bg: [number, number, number] = [
        clamp(8 + accentRgb[0] * 0.06),
        clamp(10 + accentRgb[1] * 0.06),
        clamp(14 + accentRgb[2] * 0.08),
      ];
      const panel = add(bg, [12, 12, 14]);
      const card = add(bg, [20, 20, 22]);
      const border = add(bg, [30, 30, 32]);
      const divider = add(bg, [40, 40, 42]);
      const text: [number, number, number] = [
        clamp(212 + accentRgb[0] * 0.05),
        clamp(205 + accentRgb[1] * 0.04),
        clamp(198 + accentRgb[2] * 0.03),
      ];
      const dim: [number, number, number] = [
        clamp(122 + accentRgb[0] * 0.02),
        clamp(116 + accentRgb[1] * 0.02),
        clamp(110 + accentRgb[2] * 0.02),
      ];
      return { bg, panel, card, border, divider, text, dim };
    };
    const applyThemeSurface = (accentHex: string) => {
      const rgb = hexToRgb(accentHex);
      const hover: [number, number, number] = [clamp(rgb[0] * 0.86), clamp(rgb[1] * 0.86), clamp(rgb[2] * 0.86)];
      const active: [number, number, number] = [clamp(rgb[0] * 0.72), clamp(rgb[1] * 0.72), clamp(rgb[2] * 0.72)];
      const surface = makeSurface(rgb);
      const root = document.documentElement;
      root.style.setProperty('--arvion-accent', accentHex);
      root.style.setProperty('--arvion-accent-soft', `${accentHex}22`);
      root.style.setProperty('--os-primary-rgb', rgb.join(' '));
      root.style.setProperty('--matrix-rain-rgb', rgb.join(' '));
      root.style.setProperty('--os-primary-hover-rgb', hover.join(' '));
      root.style.setProperty('--os-primary-active-rgb', active.join(' '));
      root.style.setProperty('--os-bg-rgb', surface.bg.join(' '));
      root.style.setProperty('--os-panel-rgb', surface.panel.join(' '));
      root.style.setProperty('--os-card-rgb', surface.card.join(' '));
      root.style.setProperty('--os-border-rgb', surface.border.join(' '));
      root.style.setProperty('--os-divider-rgb', surface.divider.join(' '));
      root.style.setProperty('--os-text-rgb', surface.text.join(' '));
      root.style.setProperty('--os-dim-rgb', surface.dim.join(' '));
    };

    const accent = localStorage.getItem('arvion_theme_accent');
    applyThemeSurface(accent ?? DEFAULT_ACCENT);

    const scanlines = localStorage.getItem('arvion_scanlines');
    const flicker = localStorage.getItem('arvion_flicker');
    const animationQuality = localStorage.getItem('arvion_animation_quality');
    const reducedMotion = localStorage.getItem('arvion_reduced_motion');
    const language = localStorage.getItem('arvion_language');
    if (scanlines !== null) document.documentElement.classList.toggle('no-scanlines', scanlines !== '1');
    if (flicker !== null) document.documentElement.classList.toggle('no-flicker', flicker !== '1');
    document.documentElement.classList.toggle('reduced-motion', reducedMotion === '1');
    if (animationQuality) {
      document.documentElement.classList.remove('animation-low', 'animation-medium', 'animation-high');
      document.documentElement.classList.add(`animation-${animationQuality.toLowerCase()}`);
    }
    if (language) {
      document.documentElement.setAttribute('lang', language);
    }
  }, []);

  const playPowerSound = (kind: 'shutdown' | 'restart') => {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    if (context.state === 'suspended') context.resume().catch(() => undefined);
    const now = context.currentTime;
    const pattern = kind === 'shutdown'
      ? [
          { start: 320, end: 210, duration: 0.12, delay: 0 },
          { start: 210, end: 120, duration: 0.19, delay: 0.11 },
        ]
      : [
          { start: 260, end: 420, duration: 0.1, delay: 0 },
          { start: 420, end: 640, duration: 0.11, delay: 0.08 },
          { start: 640, end: 760, duration: 0.12, delay: 0.17 },
        ];
    pattern.forEach((step) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const startAt = now + step.delay;
      osc.type = kind === 'shutdown' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(step.start, startAt);
      osc.frequency.exponentialRampToValueAtTime(Math.max(60, step.end), startAt + step.duration);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.038, startAt + Math.min(0.03, step.duration / 3));
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + step.duration);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(startAt);
      osc.stop(startAt + step.duration + 0.02);
    });
    window.setTimeout(() => context.close().catch(() => undefined), 900);
  };

  const handleShutdown = () => {
    playPowerSound('shutdown');
    setPowerState('off');
  };

  const restartWebsite = () => {
    playPowerSound('restart');
    window.setTimeout(() => window.location.reload(), 180);
  };

  return (
    <div className="w-screen h-screen bg-os-bg overflow-hidden crt relative">
      <CustomCursor />
      {powerState === 'booting' && <BootSequence onComplete={() => setPowerState('running')} />}
      {powerState === 'running' && <Desktop onLogout={handleShutdown} />}
      {powerState === 'off' && (
        <div className="w-full h-full flex items-center justify-center p-4 bg-os-bg text-os-text">
          <div className="w-[520px] max-w-[95vw] border border-os-primary bg-os-panel p-6 shadow-primary-glow text-center">
            <h2 className="font-8bit text-sm text-os-primary mb-3">WEBSITE SHUT DOWN</h2>
            <p className="text-sm text-os-text mb-2">System has been powered off.</p>
            <p className="text-xs text-os-dim mb-5">Website remains unusable until Restart Website is pressed.</p>
            <button
              type="button"
              onClick={restartWebsite}
              className="px-4 py-2 border border-os-primary text-os-primary hover:bg-os-primary hover:text-os-bg font-bold"
            >
              RESTART WEBSITE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
