import React, { useEffect, useRef } from 'react';

interface MatrixRainProps {
  className?: string;
}

export const MatrixRain: React.FC<MatrixRainProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+{}|:"<>?~`-=[]\\;\',./';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];

    for (let x = 0; x < columns; x++) {
      drops[x] = 1;
    }

    const parsePrimaryRgb = () => {
      const styles = getComputedStyle(document.documentElement);
      const raw = styles.getPropertyValue('--matrix-rain-rgb').trim() || styles.getPropertyValue('--os-primary-rgb').trim();
      const parts = raw.split(/\s+/).map((part) => Number.parseInt(part, 10));
      if (parts.length < 3 || parts.some((value) => Number.isNaN(value))) return [0, 191, 166] as const;
      return [parts[0], parts[1], parts[2]] as const;
    };

    const tint = (rgb: readonly [number, number, number], factor: number) =>
      `rgb(${Math.max(0, Math.min(255, Math.round(rgb[0] * factor)))}, ${Math.max(0, Math.min(255, Math.round(rgb[1] * factor)))}, ${Math.max(0, Math.min(255, Math.round(rgb[2] * factor)))})`;

    const draw = () => {
      if (document.documentElement.classList.contains('reduced-motion')) return;
      const accent = parsePrimaryRgb();
      const mainColor = tint(accent, 1);
      const glowColor = tint(accent, 1.2);
      const dimColor = tint(accent, 0.78);

      ctx.fillStyle = 'rgba(12, 12, 14, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = mainColor;
      ctx.font = `bold ${fontSize}px "Share Tech Mono"`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];

        if (Math.random() > 0.97) ctx.fillStyle = glowColor;
        else if (Math.random() > 0.94) ctx.fillStyle = dimColor;
        else ctx.fillStyle = mainColor;

        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const intervalForQuality = () => {
      const root = document.documentElement;
      if (root.classList.contains('animation-low')) return 96;
      if (root.classList.contains('animation-high')) return 24;
      return 33;
    };

    let interval = window.setInterval(draw, intervalForQuality());
    const observer = new MutationObserver(() => {
      window.clearInterval(interval);
      interval = window.setInterval(draw, intervalForQuality());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.clearInterval(interval);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none opacity-30 ${className}`}
    />
  );
};
