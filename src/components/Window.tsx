import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, Minus, Square } from 'lucide-react';

interface WindowProps {
  title: string;
  children: React.ReactNode;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number | string; height: number | string };
  onClose?: () => void;
  onMinimize?: () => void;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

type SnapMode = 'none' | 'left' | 'right' | 'top' | 'tl' | 'tr' | 'bl' | 'br';
type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;

const resolveSize = (value: number | string, axis: 'width' | 'height') => {
  if (typeof value === 'number') return value;
  const view = axis === 'width' ? window.innerWidth : window.innerHeight - 48;
  if (value.includes('100vw')) return window.innerWidth;
  if (value.includes('100vh') || value.includes('calc(100vh - 48px)')) return window.innerHeight - 48;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : axis === 'width' ? Math.max(MIN_WIDTH, view * 0.6) : Math.max(MIN_HEIGHT, view * 0.6);
};

export const Window: React.FC<WindowProps> = ({
  title,
  children,
  initialPosition = { x: 50, y: 50 },
  initialSize = { width: 600, height: 400 },
  onClose,
  onMinimize,
  isActive = false,
  onClick,
  className = ''
}) => {
  const dragControls = useDragControls();
  const windowRef = useRef<HTMLDivElement>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [snapMode, setSnapMode] = useState<SnapMode>('none');
  const [hoverHint, setHoverHint] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(() => ({
    width: Math.max(MIN_WIDTH, resolveSize(initialSize.width, 'width')),
    height: Math.max(MIN_HEIGHT, resolveSize(initialSize.height, 'height')),
  }));

  const resizeState = useRef<{
    dir: ResizeDir;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startPos: { x: number; y: number };
  } | null>(null);

  const isDocked = isMaximized || snapMode !== 'none';

  const snapFrame = useMemo(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight - 48;
    if (snapMode === 'left') return { x: 0, y: 0, width: vw / 2, height: vh };
    if (snapMode === 'right') return { x: vw / 2, y: 0, width: vw / 2, height: vh };
    if (snapMode === 'top') return { x: 0, y: 0, width: vw, height: vh / 2 };
    if (snapMode === 'tl') return { x: 0, y: 0, width: vw / 2, height: vh / 2 };
    if (snapMode === 'tr') return { x: vw / 2, y: 0, width: vw / 2, height: vh / 2 };
    if (snapMode === 'bl') return { x: 0, y: vh / 2, width: vw / 2, height: vh / 2 };
    if (snapMode === 'br') return { x: vw / 2, y: vh / 2, width: vw / 2, height: vh / 2 };
    return null;
  }, [snapMode]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!resizeState.current) return;
      const { dir, startX, startY, startW, startH, startPos } = resizeState.current;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      let width = startW;
      let height = startH;
      let x = startPos.x;
      let y = startPos.y;

      if (dir.includes('e')) width = Math.max(MIN_WIDTH, startW + dx);
      if (dir.includes('s')) height = Math.max(MIN_HEIGHT, startH + dy);
      if (dir.includes('w')) {
        width = Math.max(MIN_WIDTH, startW - dx);
        x = startPos.x + (startW - width);
      }
      if (dir.includes('n')) {
        height = Math.max(MIN_HEIGHT, startH - dy);
        y = startPos.y + (startH - height);
      }

      setSize({ width, height });
      setPosition({ x: Math.max(0, x), y: Math.max(0, y) });
    };

    const onPointerUp = () => {
      resizeState.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const beginResize = (dir: ResizeDir, event: React.PointerEvent<HTMLDivElement>) => {
    if (isDocked) return;
    event.preventDefault();
    event.stopPropagation();
    resizeState.current = {
      dir,
      startX: event.clientX,
      startY: event.clientY,
      startW: size.width,
      startH: size.height,
      startPos: position,
    };
    document.body.style.cursor = dir.includes('n') || dir.includes('s') ? (dir.includes('e') || dir.includes('w') ? `${dir}-resize` : 'ns-resize') : dir.includes('e') || dir.includes('w') ? 'ew-resize' : '';
    document.body.style.userSelect = 'none';
  };

  const frame = isMaximized
    ? { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight - 48 }
    : snapFrame ?? { x: position.x, y: position.y, width: size.width, height: size.height };

  return (
    <motion.div
      ref={windowRef}
      drag={!isDocked}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        setIsDragging(false);
        if (isDocked) return;
        setPosition((prev) => ({ x: Math.max(0, prev.x + info.offset.x), y: Math.max(0, prev.y + info.offset.y) }));
      }}
      initial={{ ...initialPosition, scale: 0.92, opacity: 0 }}
      animate={{ x: frame.x, y: frame.y, width: frame.width, height: frame.height, scale: isDragging ? 1.015 : 1, opacity: 1 }}
      whileDrag={{ scale: 1.02, filter: 'brightness(1.04)' }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 290, damping: 32 }}
      className={`absolute flex flex-col bg-os-bg border border-os-border rounded shadow-panel-shadow ${isActive ? 'border-os-primary shadow-primary-glow z-50' : 'z-10'} ${isDragging ? 'shadow-primary-glow ring-1 ring-os-primary/60' : ''} overflow-hidden ${className}`}
      onClick={onClick}
      style={{ minWidth: MIN_WIDTH, minHeight: MIN_HEIGHT }}
    >
      {isDragging && (
        <div className="absolute inset-0 pointer-events-none z-[2] border border-os-primary/60 shadow-[0_0_28px_rgb(var(--os-primary-rgb)/0.4)] rounded" />
      )}
      <div
        className={`h-8 flex items-center justify-between px-3 select-none cursor-move border-b relative ${isActive ? 'bg-os-panel border-os-primary text-os-primary' : 'bg-os-bg border-os-border text-os-dim'}`}
        onPointerDown={(e) => dragControls.start(e)}
        onDoubleClick={() => {
          setSnapMode('none');
          setIsMaximized((prev) => !prev);
        }}
      >
        <div className="flex items-center gap-2 font-8bit text-[10px] truncate">
          <span className={`w-2 h-2 inline-block rounded-sm ${isActive ? 'bg-os-primary animate-pulse' : 'bg-os-dim'}`}></span>
          {title}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMaximized(false);
              setSnapMode((prev) => (prev === 'left' ? 'none' : 'left'));
            }}
            onMouseEnter={() => setHoverHint('Snap Left')}
            onMouseLeave={() => setHoverHint(null)}
            className={`px-1.5 text-[12px] leading-none rounded hover:bg-os-card ${snapMode === 'left' ? 'text-os-primary' : ''}`}
          >
            L
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMaximized(false);
              setSnapMode((prev) => (prev === 'right' ? 'none' : 'right'));
            }}
            onMouseEnter={() => setHoverHint('Snap Right')}
            onMouseLeave={() => setHoverHint(null)}
            className={`px-1.5 text-[12px] leading-none rounded hover:bg-os-card ${snapMode === 'right' ? 'text-os-primary' : ''}`}
          >
            R
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMaximized(false);
              setSnapMode((prev) => {
                if (prev === 'tl') return 'tr';
                if (prev === 'tr') return 'br';
                if (prev === 'br') return 'bl';
                if (prev === 'bl') return 'none';
                return 'tl';
              });
            }}
            onMouseEnter={() => setHoverHint('Cycle Quadrants')}
            onMouseLeave={() => setHoverHint(null)}
            className={`px-1.5 text-[11px] leading-none rounded hover:bg-os-card ${snapMode === 'tl' || snapMode === 'tr' || snapMode === 'bl' || snapMode === 'br' ? 'text-os-primary' : ''}`}
          >
            Q
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMaximized(false);
              setSnapMode((prev) => (prev === 'top' ? 'none' : 'top'));
            }}
            onMouseEnter={() => setHoverHint('Snap Top')}
            onMouseLeave={() => setHoverHint(null)}
            className={`px-1.5 text-[12px] leading-none rounded hover:bg-os-card ${snapMode === 'top' ? 'text-os-primary' : ''}`}
          >
            T
          </button>
          <div className="w-px h-4 bg-os-divider mx-1" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMinimize?.();
            }}
            onMouseEnter={() => setHoverHint('Minimize')}
            onMouseLeave={() => setHoverHint(null)}
            className={`p-1 rounded hover:bg-os-card transition-colors ${isActive ? 'text-os-primary hover:text-os-primaryHover' : 'text-os-dim hover:text-os-text'}`}
          >
            <Minus size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSnapMode('none');
              setIsMaximized((prev) => !prev);
            }}
            onMouseEnter={() => setHoverHint(isMaximized ? 'Restore' : 'Maximize')}
            onMouseLeave={() => setHoverHint(null)}
            className={`p-1 rounded hover:bg-os-card transition-colors ${isActive ? 'text-os-primary hover:text-os-primaryHover' : 'text-os-dim hover:text-os-text'}`}
          >
            <Square size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            onMouseEnter={() => setHoverHint('Close')}
            onMouseLeave={() => setHoverHint(null)}
            className={`p-1 rounded hover:bg-os-error hover:text-white transition-colors ${isActive ? 'text-os-primary' : 'text-os-dim'}`}
          >
            <X size={14} />
          </button>
        </div>
        {hoverHint && (
          <div className="absolute right-2 top-8 z-20 px-2 py-1 text-[10px] bg-os-panel border border-os-primary text-os-primary rounded shadow-primary-glow pointer-events-none whitespace-nowrap">
            {hoverHint}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-os-bg relative">
        <div className="h-full w-full">{children}</div>
      </div>

      {!isDocked && (
        <>
          <div className="absolute top-0 left-2 right-2 h-1 cursor-ns-resize" onPointerDown={(e) => beginResize('n', e)} />
          <div className="absolute bottom-0 left-2 right-2 h-1 cursor-ns-resize" onPointerDown={(e) => beginResize('s', e)} />
          <div className="absolute left-0 top-2 bottom-2 w-1 cursor-ew-resize" onPointerDown={(e) => beginResize('w', e)} />
          <div className="absolute right-0 top-2 bottom-2 w-1 cursor-ew-resize" onPointerDown={(e) => beginResize('e', e)} />

          <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize" onPointerDown={(e) => beginResize('nw', e)} />
          <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize" onPointerDown={(e) => beginResize('ne', e)} />
          <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize" onPointerDown={(e) => beginResize('sw', e)} />
          <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize" onPointerDown={(e) => beginResize('se', e)} />
        </>
      )}
    </motion.div>
  );
};
