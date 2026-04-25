
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Box, FileText, Folder, Gamepad2, Music, ShieldAlert } from 'lucide-react';
import { EncryptionText } from './EncryptionText';

export interface AppWindowSize {
  width: number | string;
  height: number | string;
}

export interface WindowLaunchConfig {
  title: string;
  render: (windowId: string) => React.ReactNode;
  initialSize: AppWindowSize;
  fullscreen?: boolean;
}

export type LaunchWindow = (config: WindowLaunchConfig) => void;

interface AppProps {
  showStatus: (message: string) => void;
}

interface BrowserProps extends AppProps {
  launchWindow: LaunchWindow;
}

const FILE_TREE: Record<string, string[]> = {
  '/root/arvion': ['src', 'assets', 'logs', 'games', 'README.txt', 'config.sys'],
  '/root/arvion/src': ['components', 'pages', 'main.tsx', 'App.tsx'],
  '/root/arvion/assets': ['wallpaper.png', 'boot.wav'],
  '/root/arvion/logs': ['system.log', 'security.log'],
  '/root/arvion/games': ['tetris.exe', 'pong.exe'],
};

const FILE_PREVIEW: Record<string, string> = {
  'README.txt': 'ARVION by Y7XIFIED\nPOWERED BY Y7X',
  'config.sys': 'theme=global\ncursor=enabled\nmatrix=sync',
  'main.tsx': 'createRoot(document.getElementById("root")!).render(<App />)',
  'App.tsx': 'Routes: / and * (NotFound)',
  'system.log': 'System check complete. No anomalies found.',
  'security.log': 'Firewall status: ACTIVE\nThreats blocked: 12',
  'tetris.exe': 'Executable ready.',
  'pong.exe': 'Executable ready.',
};

const ROOT_PATH = '/root/arvion';
const DEFAULT_ACCENT_HEX = '#00BFA6';
const DEFAULT_ACCENT_RGB: [number, number, number] = [0, 191, 166];

const clampColor = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const getPrimaryRgbFromDocument = (): [number, number, number] => {
  if (typeof window === 'undefined') return DEFAULT_ACCENT_RGB;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--os-primary-rgb').trim();
  const parts = raw.split(/\s+/).map((part) => Number.parseInt(part, 10));
  if (parts.length < 3 || parts.some((value) => Number.isNaN(value))) return DEFAULT_ACCENT_RGB;
  return [parts[0], parts[1], parts[2]];
};

const rgbToCss = (rgb: [number, number, number]) => `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
const rgbToCssAlpha = (rgb: [number, number, number], alpha: number) => `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]} / ${alpha})`;

const hexToRgbTriplet = (hex: string): [number, number, number] => {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length !== 6) return DEFAULT_ACCENT_RGB;
  const parsed = Number.parseInt(normalized, 16);
  if (Number.isNaN(parsed)) return DEFAULT_ACCENT_RGB;
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
};

const shadeRgb = (rgb: [number, number, number], factor: number): [number, number, number] => [
  clampColor(rgb[0] * factor),
  clampColor(rgb[1] * factor),
  clampColor(rgb[2] * factor),
];

const addRgb = (rgb: [number, number, number], offset: [number, number, number]): [number, number, number] => [
  clampColor(rgb[0] + offset[0]),
  clampColor(rgb[1] + offset[1]),
  clampColor(rgb[2] + offset[2]),
];

const buildPiecePalette = (accent: [number, number, number]) => {
  const a = accent;
  return [
    rgbToCss(a),
    rgbToCss(shadeRgb(a, 0.88)),
    rgbToCss(shadeRgb(a, 1.14)),
    rgbToCss(addRgb(shadeRgb(a, 0.78), [24, 24, 24])),
    rgbToCss(addRgb(a, [20, -12, 10])),
    rgbToCss(addRgb(shadeRgb(a, 0.7), [16, 0, 20])),
    rgbToCss(addRgb(shadeRgb(a, 0.62), [38, 38, 38])),
  ];
};

const deriveThemeSurface = (accentRgb: [number, number, number]) => {
  const bg: [number, number, number] = [
    clampColor(8 + accentRgb[0] * 0.06),
    clampColor(10 + accentRgb[1] * 0.06),
    clampColor(14 + accentRgb[2] * 0.08),
  ];
  const panel = addRgb(bg, [12, 12, 14]);
  const card = addRgb(bg, [20, 20, 22]);
  const border = addRgb(bg, [30, 30, 32]);
  const divider = addRgb(bg, [40, 40, 42]);
  const text: [number, number, number] = [
    clampColor(212 + accentRgb[0] * 0.05),
    clampColor(205 + accentRgb[1] * 0.04),
    clampColor(198 + accentRgb[2] * 0.03),
  ];
  const dim: [number, number, number] = [
    clampColor(122 + accentRgb[0] * 0.02),
    clampColor(116 + accentRgb[1] * 0.02),
    clampColor(110 + accentRgb[2] * 0.02),
  ];
  return { bg, panel, card, border, divider, text, dim };
};

type TrackDefinition = {
  file: string;
  title: string;
  vibe: string;
  wave: OscillatorType;
  filter: BiquadFilterType;
  cutoff: number;
  resonance: number;
  tempoMs: number;
  noteSeconds: number;
  glide: number;
  harmonyRatio: number;
  notes: number[];
};

const TRACK_LIBRARY: TrackDefinition[] = [
  {
    file: 'CYBER_CITY_NIGHTS.MP3',
    title: 'Neon Sprint',
    vibe: 'Bright arcade lead',
    wave: 'square',
    filter: 'highpass',
    cutoff: 680,
    resonance: 5.2,
    tempoMs: 136,
    noteSeconds: 0.1,
    glide: 1.01,
    harmonyRatio: 2,
    notes: [261.63, 329.63, 392, 523.25, 392, 329.63, 261.63, 196],
  },
  {
    file: 'CHROMA_PROTOCALM.WAV',
    title: 'Proto Calm',
    vibe: 'Warm lo-fi synth pad',
    wave: 'triangle',
    filter: 'lowpass',
    cutoff: 2350,
    resonance: 1.1,
    tempoMs: 204,
    noteSeconds: 0.18,
    glide: 1.003,
    harmonyRatio: 1.5,
    notes: [220, 261.63, 293.66, 349.23, 392, 349.23, 293.66, 261.63],
  },
  {
    file: 'Y7X_MAINFRAME_LOOP.OGG',
    title: 'Mainframe Loop',
    vibe: 'Crunchy machine groove',
    wave: 'sawtooth',
    filter: 'bandpass',
    cutoff: 1260,
    resonance: 6.8,
    tempoMs: 172,
    noteSeconds: 0.13,
    glide: 1.02,
    harmonyRatio: 0,
    notes: [329.63, 392, 493.88, 587.33, 493.88, 392, 329.63, 246.94],
  },
];

const PIECES = [
  [[1, 1, 1, 1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
];

const createBoard = () => Array.from({ length: 18 }, () => Array(10).fill(0));

const randomPiece = () => {
  const index = Math.floor(Math.random() * PIECES.length);
  return { shape: PIECES[index], x: 3, y: 0, colorIndex: index + 1 };
};

const rotateShape = (shape: number[][]) =>
  shape[0].map((_, col) => shape.map((row) => row[col]).reverse());

const collides = (
  board: number[][],
  piece: { shape: number[][]; x: number; y: number },
  testX = piece.x,
  testY = piece.y,
  testShape = piece.shape
) => {
  for (let y = 0; y < testShape.length; y++) {
    for (let x = 0; x < testShape[y].length; x++) {
      if (!testShape[y][x]) continue;
      const boardX = testX + x;
      const boardY = testY + y;
      if (boardX < 0 || boardX >= board[0].length || boardY >= board.length) return true;
      if (boardY >= 0 && board[boardY][boardX] !== 0) return true;
    }
  }
  return false;
};

const mergePiece = (board: number[][], piece: { shape: number[][]; x: number; y: number; colorIndex: number }) => {
  const next = board.map((row) => [...row]);
  piece.shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell) return;
      const boardY = piece.y + y;
      const boardX = piece.x + x;
      if (boardY >= 0 && boardY < next.length && boardX >= 0 && boardX < next[0].length) {
        next[boardY][boardX] = piece.colorIndex;
      }
    });
  });
  return next;
};

const clearLines = (board: number[][]) => {
  const remaining = board.filter((row) => row.some((cell) => cell === 0));
  const cleared = board.length - remaining.length;
  while (remaining.length < board.length) remaining.unshift(Array(board[0].length).fill(0));
  return { board: remaining, cleared };
};

export const FilesApp: React.FC<AppProps> = ({ showStatus }) => {
  const recyclePath = `${ROOT_PATH}/recycle_bin`;
  const [path, setPath] = useState(ROOT_PATH);
  const [selected, setSelected] = useState<string>('README.txt');
  const [renameValue, setRenameValue] = useState('');
  const [dragItem, setDragItem] = useState<{ name: string; fromPath: string } | null>(null);
  const [fileTree, setFileTree] = useState<Record<string, string[]>>(() => ({
    ...JSON.parse(JSON.stringify(FILE_TREE)),
    [ROOT_PATH]: [...FILE_TREE[ROOT_PATH], 'recycle_bin'],
    [recyclePath]: [],
  }));
  const [filePreview, setFilePreview] = useState<Record<string, string>>(() => ({ ...FILE_PREVIEW }));
  const [recycleBin, setRecycleBin] = useState<Array<{ name: string; content: string; originPath: string }>>([]);

  const entries = useMemo(() => {
    if (path === recyclePath) return recycleBin.map((item) => item.name);
    const currentEntries = fileTree[path] ?? [];
    return [...currentEntries].sort((a, b) => {
      const aDir = Boolean(fileTree[`${path}/${a}`]);
      const bDir = Boolean(fileTree[`${path}/${b}`]);
      if (aDir !== bDir) return aDir ? -1 : 1;
      return a.localeCompare(b);
    });
  }, [fileTree, path, recycleBin, recyclePath]);

  const openEntry = (entry: string) => {
    if (path === recyclePath) {
      setSelected(entry);
      setRenameValue(entry);
      return;
    }
    const nextPath = `${path}/${entry}`.replace('//', '/');
    if (fileTree[nextPath]) {
      setPath(nextPath);
      setSelected('');
      setRenameValue('');
      showStatus(`Opened ${nextPath}`);
      return;
    }
    setSelected(entry);
    setRenameValue(entry);
    showStatus(`Opened ${entry}`);
  };

  const goUp = () => {
    if (path === ROOT_PATH) return;
    const parent = path.split('/').slice(0, -1).join('/') || ROOT_PATH;
    setPath(parent);
    setSelected('');
    setRenameValue('');
    showStatus(`Moved to ${parent}`);
  };

  const refreshDirectory = () => {
    setFilePreview((prev) => ({
      ...prev,
      'system.log': `System check complete. No anomalies found.\nLast scan: ${new Date().toLocaleTimeString()}`,
    }));
    showStatus(`Refreshed ${path}`);
  };

  const createTextFile = () => {
    if (path === recyclePath) return;
    const name = `note_${Date.now().toString().slice(-4)}.txt`;
    setFileTree((prev) => ({ ...prev, [path]: [...(prev[path] ?? []), name] }));
    setFilePreview((prev) => ({
      ...prev,
      [name]: `New file created at ${new Date().toLocaleString()}\nPath: ${path}/${name}`,
    }));
    setSelected(name);
    setRenameValue(name);
    showStatus(`${name} created`);
  };

  const createFolder = () => {
    if (path === recyclePath) return;
    const name = `folder_${Date.now().toString().slice(-3)}`;
    const nextPath = `${path}/${name}`;
    setFileTree((prev) => ({ ...prev, [path]: [...(prev[path] ?? []), name], [nextPath]: [] }));
    showStatus(`${name} created`);
  };

  const renameEntry = () => {
    if (!selected || !renameValue.trim() || path === recyclePath) return;
    if (selected === renameValue.trim()) return;
    const nextName = renameValue.trim();
    const oldPath = `${path}/${selected}`;
    const newPath = `${path}/${nextName}`;
    const isDir = Boolean(fileTree[oldPath]);
    setFileTree((prev) => {
      const next = { ...prev, [path]: (prev[path] ?? []).map((item) => (item === selected ? nextName : item)) };
      if (isDir) {
        next[newPath] = prev[oldPath];
        delete next[oldPath];
      }
      return next;
    });
    setFilePreview((prev) => {
      const next = { ...prev };
      if (next[selected]) {
        next[nextName] = next[selected];
        delete next[selected];
      }
      return next;
    });
    setSelected(nextName);
    showStatus(`${selected} renamed to ${nextName}`);
  };

  const deleteEntry = () => {
    if (!selected || path === recyclePath) return;
    const targetPath = `${path}/${selected}`;
    const isDir = Boolean(fileTree[targetPath]);
    if (isDir) {
      setFileTree((prev) => {
        const next = { ...prev, [path]: (prev[path] ?? []).filter((item) => item !== selected) };
        delete next[targetPath];
        return next;
      });
      showStatus(`Folder ${selected} deleted`);
    } else {
      setFileTree((prev) => ({ ...prev, [path]: (prev[path] ?? []).filter((item) => item !== selected), [recyclePath]: [...(prev[recyclePath] ?? []), selected] }));
      setRecycleBin((prev) => [...prev, { name: selected, content: filePreview[selected] ?? '', originPath: path }]);
      showStatus(`${selected} moved to recycle bin`);
    }
    setSelected('');
    setRenameValue('');
  };

  const restoreFromRecycle = () => {
    if (!selected || path !== recyclePath) return;
    const entry = recycleBin.find((item) => item.name === selected);
    if (!entry) return;
    setFileTree((prev) => ({
      ...prev,
      [entry.originPath]: [...(prev[entry.originPath] ?? []), entry.name],
      [recyclePath]: (prev[recyclePath] ?? []).filter((name) => name !== entry.name),
    }));
    setRecycleBin((prev) => prev.filter((item) => item.name !== selected));
    setFilePreview((prev) => ({ ...prev, [entry.name]: entry.content }));
    showStatus(`${selected} restored`);
    setSelected('');
    setRenameValue('');
  };

  const purgeRecycleEntry = () => {
    if (!selected || path !== recyclePath) return;
    setFileTree((prev) => ({ ...prev, [recyclePath]: (prev[recyclePath] ?? []).filter((name) => name !== selected) }));
    setRecycleBin((prev) => prev.filter((item) => item.name !== selected));
    showStatus(`${selected} permanently deleted`);
    setSelected('');
    setRenameValue('');
  };

  const uploadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (path === recyclePath) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const name = file.name;
      const text = typeof reader.result === 'string' ? reader.result : 'Binary file';
      setFileTree((prev) => ({ ...prev, [path]: [...(prev[path] ?? []), name] }));
      setFilePreview((prev) => ({ ...prev, [name]: text.slice(0, 5000) }));
      setSelected(name);
      setRenameValue(name);
      showStatus(`${name} uploaded`);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const downloadFile = () => {
    if (!selected || path === recyclePath) return;
    const filePath = `${path}/${selected}`;
    if (fileTree[filePath]) return;
    const blob = new Blob([filePreview[selected] ?? ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selected;
    a.click();
    URL.revokeObjectURL(url);
    showStatus(`${selected} downloaded`);
  };

  const moveFileToFolder = (entry: string, targetFolder: string) => {
    if (path === recyclePath) return;
    const sourcePath = `${path}/${entry}`;
    if (fileTree[sourcePath]) return;
    const targetPath = `${path}/${targetFolder}`;
    if (!fileTree[targetPath]) return;
    setFileTree((prev) => ({
      ...prev,
      [path]: (prev[path] ?? []).filter((item) => item !== entry),
      [targetPath]: [...(prev[targetPath] ?? []), entry],
    }));
    showStatus(`${entry} moved to ${targetFolder}`);
  };

  return (
    <div className="h-full flex flex-col bg-os-bg text-os-text">
      <div className="p-2 border-b border-os-border flex items-center gap-2 flex-wrap">
        <button type="button" onClick={goUp} className="px-2 py-1 border border-os-border hover:border-os-primary">UP</button>
        <button type="button" onClick={refreshDirectory} className="px-2 py-1 border border-os-border hover:border-os-primary">REFRESH</button>
        <button type="button" onClick={createTextFile} className="px-2 py-1 border border-os-border hover:border-os-primary">NEW TXT</button>
        <button type="button" onClick={createFolder} className="px-2 py-1 border border-os-border hover:border-os-primary">NEW DIR</button>
        <button type="button" onClick={renameEntry} className="px-2 py-1 border border-os-border hover:border-os-primary">RENAME</button>
        <button type="button" onClick={deleteEntry} className="px-2 py-1 border border-os-warning text-os-warning hover:bg-os-warning hover:text-os-bg">DELETE</button>
        <button type="button" onClick={downloadFile} className="px-2 py-1 border border-os-border hover:border-os-primary">DOWNLOAD</button>
        <label className="px-2 py-1 border border-os-border hover:border-os-primary cursor-pointer">
          UPLOAD
          <input type="file" className="hidden" onChange={uploadFile} />
        </label>
        {path === recyclePath && (
          <>
            <button type="button" onClick={restoreFromRecycle} className="px-2 py-1 border border-os-success text-os-success hover:bg-os-success hover:text-os-bg">RESTORE</button>
            <button type="button" onClick={purgeRecycleEntry} className="px-2 py-1 border border-os-warning text-os-warning hover:bg-os-warning hover:text-os-bg">PURGE</button>
          </>
        )}
        <input
          type="text"
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
          placeholder="Rename selected..."
          className="bg-os-panel border border-os-border px-2 py-1 text-xs"
        />
        <span className="text-os-primary font-bold">{path}/</span>
      </div>
      <div className="flex-1 grid grid-cols-2">
        <div className="p-3 border-r border-os-border space-y-2 overflow-auto">
          {entries.map((entry) => {
            const folder = path !== recyclePath ? fileTree[`${path}/${entry}`] : null;
            return (
              <button
                key={`${path}-${entry}`}
                type="button"
                draggable={Boolean(!folder && path !== recyclePath)}
                onDragStart={() => setDragItem({ name: entry, fromPath: path })}
                onDragOver={(event) => {
                  if (folder) event.preventDefault();
                }}
                onDrop={() => {
                  if (folder && dragItem && dragItem.fromPath === path) moveFileToFolder(dragItem.name, entry);
                }}
                onClick={() => openEntry(entry)}
                className={`w-full text-left px-2 py-2 border ${selected === entry ? 'border-os-primary bg-os-primarySoft' : 'border-os-border hover:border-os-primary hover:bg-os-card'} flex items-center gap-2`}
              >
                {folder ? <Folder size={16} className="text-os-primary" /> : <FileText size={16} className="text-os-accentBronze" />}
                {entry}
              </button>
            );
          })}
        </div>
        <div className="p-3 overflow-auto">
          <div className="text-os-dim text-xs mb-2">{path === recyclePath ? 'RECYCLE PREVIEW' : 'PREVIEW'}</div>
          <pre className="whitespace-pre-wrap text-sm">
            {selected
              ? path === recyclePath
                ? recycleBin.find((item) => item.name === selected)?.content ?? 'Recycle item preview unavailable.'
                : filePreview[selected] ?? 'No preview available.'
              : 'Directory selected.'}
          </pre>
        </div>
      </div>
    </div>
  );
};

export const SystemApp: React.FC<AppProps> = ({ showStatus }) => {
  const [cpu, setCpu] = useState(42);
  const [memory, setMemory] = useState(67);
  const [storage, setStorage] = useState(38);

  const benchmark = () => {
    setCpu(Math.floor(30 + Math.random() * 40));
    setMemory(Math.floor(40 + Math.random() * 50));
    setStorage(Math.floor(20 + Math.random() * 60));
    showStatus('System benchmark complete');
  };

  return (
    <div className="p-4 font-mono text-os-text h-full bg-os-bg">
      <h2 className="text-2xl mb-4 font-8bit text-os-primary text-shadow-glow">ARVION by Y7XIFIED</h2>
      <div className="grid grid-cols-2 gap-4 bg-os-card p-4 rounded border border-os-border">
        <div>
          <p className="text-os-dim text-xs font-bold">CPU LOAD</p>
          <p>{cpu}%</p>
        </div>
        <div>
          <p className="text-os-dim text-xs font-bold">MEMORY</p>
          <p>{memory}%</p>
        </div>
        <div>
          <p className="text-os-dim text-xs font-bold">STORAGE</p>
          <p>{storage}%</p>
        </div>
        <div>
          <p className="text-os-dim text-xs font-bold">STATUS</p>
          <p className="text-os-success font-bold">OPTIMAL</p>
        </div>
      </div>
      <button type="button" onClick={benchmark} className="mt-4 px-4 py-2 border border-os-primary text-os-primary hover:bg-os-primary hover:text-os-bg">
        RUN BENCHMARK
      </button>
      <div className="mt-6 border border-os-primary bg-os-primarySoft p-4 rounded">
        <EncryptionText text="POWERED BY Y7X" speed={16} className="text-os-primary font-bold" />
      </div>
    </div>
  );
};

export const SecurityApp: React.FC<AppProps> = ({ showStatus }) => {
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<string[]>([]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 10, 100);
        if (next === 100) {
          setRunning(false);
          setReport([
            'Firewall integrity: OK',
            'Port scan: no suspicious listeners',
            'Signature check: up to date',
          ]);
          showStatus('Diagnostics complete: secure');
        }
        return next;
      });
    }, 180);
    return () => window.clearInterval(id);
  }, [running, showStatus]);

  const startScan = () => {
    setProgress(0);
    setReport([]);
    setRunning(true);
    showStatus('Diagnostics started');
  };

  return (
    <div className="p-4 font-mono text-os-text h-full bg-os-panel">
      <div className="flex items-center gap-3 mb-4">
        <ShieldAlert size={32} className="text-os-warning" />
        <h2 className="font-8bit text-os-warning">FIREWALL ACTIVE</h2>
      </div>
      <div className="h-4 border border-os-border bg-os-bg mb-3">
        <div className="h-full bg-os-warning transition-all" style={{ width: `${progress}%` }} />
      </div>
      <button type="button" onClick={startScan} disabled={running} className="px-4 py-2 border border-os-warning text-os-warning hover:bg-os-warning hover:text-os-bg disabled:opacity-60">
        {running ? 'SCANNING...' : 'RUN DIAGNOSTICS'}
      </button>
      <div className="mt-4 space-y-1 text-sm">
        {report.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
};

export const MusicApp: React.FC<AppProps> = ({ showStatus }) => {
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [masterVolume, setMasterVolume] = useState(72);
  const [goofyMode, setGoofyMode] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sequenceTimerRef = useRef<number | null>(null);
  const noteCursorRef = useRef(0);
  const coverTapRef = useRef<number[]>([]);

  const currentTrack = TRACK_LIBRARY[trackIndex] ?? TRACK_LIBRARY[0];

  const getAudioContext = () => {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
    return audioContextRef.current;
  };

  const playNote = (track: TrackDefinition, frequency: number, seconds = track.noteSeconds) => {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === 'suspended') context.resume().catch(() => undefined);

    const adjustedFrequency = goofyMode
      ? frequency * (1.18 + Math.random() * 0.08)
      : frequency;
    const oscillator = context.createOscillator();
    const harmonyOsc = track.harmonyRatio > 0 ? context.createOscillator() : null;
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const now = context.currentTime;
    const outputGain = Math.max(0.018, Math.min(0.24, masterVolume / 500));

    oscillator.type = track.wave;
    oscillator.frequency.setValueAtTime(adjustedFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, adjustedFrequency * track.glide), now + seconds);
    filter.type = track.filter;
    filter.frequency.setValueAtTime(track.cutoff, now);
    filter.Q.setValueAtTime(track.resonance, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(outputGain, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);

    oscillator.connect(filter);
    if (harmonyOsc) {
      harmonyOsc.type = 'sine';
      harmonyOsc.frequency.setValueAtTime(adjustedFrequency * track.harmonyRatio, now);
      harmonyOsc.frequency.exponentialRampToValueAtTime(Math.max(40, adjustedFrequency * track.harmonyRatio * 0.997), now + seconds);
      harmonyOsc.connect(filter);
    }
    filter.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    harmonyOsc?.start(now);
    oscillator.stop(now + seconds + 0.03);
    harmonyOsc?.stop(now + seconds + 0.03);
  };

  const stopSequence = () => {
    if (sequenceTimerRef.current !== null) {
      window.clearInterval(sequenceTimerRef.current);
      sequenceTimerRef.current = null;
    }
  };

  const startSequence = () => {
    stopSequence();
    noteCursorRef.current = 0;
    const track = TRACK_LIBRARY[trackIndex] ?? TRACK_LIBRARY[0];
    const pattern = track.notes;
    sequenceTimerRef.current = window.setInterval(() => {
      const note = pattern[noteCursorRef.current % pattern.length];
      noteCursorRef.current += 1;
      if (note > 0) playNote(track, note);
    }, track.tempoMs);
  };

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + 2;
        if (next >= 100) {
          setTrackIndex((i) => (i + 1) % TRACK_LIBRARY.length);
          return 0;
        }
        return next;
      });
    }, 220);
    return () => window.clearInterval(id);
  }, [playing]);

  useEffect(() => {
    if (!playing) {
      stopSequence();
      return;
    }
    startSequence();
    return stopSequence;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, trackIndex, masterVolume]);

  useEffect(() => () => {
    stopSequence();
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  }, []);

  const prev = () => {
    setTrackIndex((i) => (i - 1 + TRACK_LIBRARY.length) % TRACK_LIBRARY.length);
    setProgress(0);
    showStatus('Previous track');
  };
  const next = () => {
    setTrackIndex((i) => (i + 1) % TRACK_LIBRARY.length);
    setProgress(0);
    showStatus('Next track');
  };
  const toggle = () => {
    const context = getAudioContext();
    if (context?.state === 'suspended') context.resume().catch(() => undefined);
    setPlaying((p) => !p);
    showStatus(playing ? 'Playback paused' : 'Playback started');
  };

  const onCoverTap = () => {
    const now = Date.now();
    const taps = [...coverTapRef.current.filter((timestamp) => now - timestamp < 1200), now];
    coverTapRef.current = taps;
    if (taps.length < 5) return;
    coverTapRef.current = [];
    setGoofyMode((prev) => {
      const nextMode = !prev;
      showStatus(nextMode ? 'Goofy mix enabled. Banana bass online.' : 'Goofy mix disabled');
      return nextMode;
    });
  };

  return (
    <div className="p-4 font-mono text-os-text h-full flex flex-col bg-os-panel">
      <button
        type="button"
        onClick={onCoverTap}
        className="flex-1 flex items-center justify-center border-2 border-os-border bg-os-bg mb-4 relative overflow-hidden"
      >
        <Music size={64} className={`text-os-primary ${playing ? (goofyMode ? 'animate-spin' : 'animate-bounce') : ''}`} />
        {goofyMode && (
          <div className="absolute bottom-3 text-[11px] font-bold text-os-warning tracking-wide">
            GOOFY MODE
          </div>
        )}
      </button>
      <div className="text-[10px] text-os-dim mb-2 -mt-2">Hint: tap album art 5x quickly.</div>
      <div className="bg-os-card p-4 border border-os-border">
        <div className="text-os-primary font-bold">{currentTrack.file}</div>
        <div className="text-xs text-os-dim mb-2">{currentTrack.title} | {currentTrack.vibe}</div>
        <div className="text-xs text-os-dim mb-2">NOW PLAYING</div>
        <div className="w-full bg-os-bg h-2 mb-4 rounded overflow-hidden">
          <div className="bg-os-primary h-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-xs text-os-dim mb-1">
            <span>Master Volume</span>
            <span>{masterVolume}%</span>
          </div>
          <input type="range" min={0} max={100} value={masterVolume} onChange={(event) => setMasterVolume(Number(event.target.value))} className="w-full accent-os-primary" />
        </div>
        <div className="flex justify-center gap-4">
          <button type="button" onClick={prev} className="p-2 hover:bg-os-primaryHover hover:text-os-bg text-os-primary border border-os-primary transition-colors">
            PREVIOUS
          </button>
          <button type="button" onClick={toggle} className="p-2 bg-os-primary text-os-bg hover:bg-os-primaryHover transition-colors font-bold px-6">
            {playing ? 'PAUSE' : 'PLAY'}
          </button>
          <button type="button" onClick={next} className="p-2 hover:bg-os-primaryHover hover:text-os-bg text-os-primary border border-os-primary transition-colors">
            NEXT TRACK
          </button>
        </div>
        <div className="mt-3 space-y-1">
          {TRACK_LIBRARY.map((track, idx) => (
            <button
              key={track.file}
              type="button"
              onClick={() => {
                setTrackIndex(idx);
                setProgress(0);
                showStatus(`${track.title} loaded`);
              }}
              className={`w-full text-left px-2 py-1 text-xs border ${idx === trackIndex ? 'border-os-primary text-os-primary bg-os-primarySoft' : 'border-os-border hover:border-os-primary'}`}
            >
              {track.file}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface TetrisState {
  board: number[][];
  piece: { shape: number[][]; x: number; y: number; colorIndex: number };
  score: number;
  lines: number;
  running: boolean;
  gameOver: boolean;
}
export const TetrisApp: React.FC<AppProps & { compact?: boolean }> = ({ showStatus, compact = false }) => {
  const [state, setState] = useState<TetrisState>({
    board: createBoard(),
    piece: randomPiece(),
    score: 0,
    lines: 0,
    running: true,
    gameOver: false,
  });

  const step = () => {
    setState((prev) => {
      if (!prev.running || prev.gameOver) return prev;

      if (!collides(prev.board, prev.piece, prev.piece.x, prev.piece.y + 1)) {
        return { ...prev, piece: { ...prev.piece, y: prev.piece.y + 1 } };
      }

      const merged = mergePiece(prev.board, prev.piece);
      const { board: clearedBoard, cleared } = clearLines(merged);
      const nextPiece = randomPiece();
      const blocked = collides(clearedBoard, nextPiece);
      if (cleared > 0) showStatus(`Cleared ${cleared} line${cleared > 1 ? 's' : ''}`);

      return {
        board: clearedBoard,
        piece: nextPiece,
        score: prev.score + cleared * 120 + 10,
        lines: prev.lines + cleared,
        running: blocked ? false : prev.running,
        gameOver: blocked,
      };
    });
  };

  useEffect(() => {
    if (!state.running || state.gameOver) return;
    const id = window.setInterval(step, 420);
    return () => window.clearInterval(id);
  }, [state.running, state.gameOver]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setState((prev) =>
          collides(prev.board, prev.piece, prev.piece.x - 1, prev.piece.y) ? prev : { ...prev, piece: { ...prev.piece, x: prev.piece.x - 1 } }
        );
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setState((prev) =>
          collides(prev.board, prev.piece, prev.piece.x + 1, prev.piece.y) ? prev : { ...prev, piece: { ...prev.piece, x: prev.piece.x + 1 } }
        );
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        step();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setState((prev) => {
          const rotated = rotateShape(prev.piece.shape);
          return collides(prev.board, prev.piece, prev.piece.x, prev.piece.y, rotated)
            ? prev
            : { ...prev, piece: { ...prev.piece, shape: rotated } };
        });
      } else if (event.key === ' ') {
        event.preventDefault();
        setState((prev) => ({ ...prev, running: !prev.running }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const renderedBoard = useMemo(() => {
    const overlay = state.board.map((row) => [...row]);
    state.piece.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (!cell) return;
        const boardY = state.piece.y + y;
        const boardX = state.piece.x + x;
        if (boardY >= 0 && boardY < overlay.length && boardX >= 0 && boardX < overlay[0].length) {
          overlay[boardY][boardX] = state.piece.colorIndex;
        }
      });
    });
    return overlay;
  }, [state]);

  const reset = () => {
    setState({
      board: createBoard(),
      piece: randomPiece(),
      score: 0,
      lines: 0,
      running: true,
      gameOver: false,
    });
    showStatus('TETRIS restarted');
  };

  const cellSize = compact ? 14 : 18;
  const piecePalette = buildPiecePalette(getPrimaryRgbFromDocument());

  return (
    <div className="h-full bg-os-bg text-os-text p-3 font-mono">
      <div className="flex justify-between items-center mb-2 text-xs">
        <span>SCORE: {state.score}</span>
        <span>LINES: {state.lines}</span>
      </div>
      <div className="inline-grid gap-[1px] bg-os-border p-1 mb-2" style={{ gridTemplateColumns: `repeat(10, ${cellSize}px)` }}>
        {renderedBoard.flatMap((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              style={{ width: cellSize, height: cellSize, backgroundColor: cell ? piecePalette[cell - 1] : 'rgb(var(--os-bg-rgb))' }}
            />
          ))
        )}
      </div>
      <div className="flex gap-2 flex-wrap text-xs">
        <button type="button" onClick={() => setState((p) => ({ ...p, running: !p.running }))} className="px-2 py-1 border border-os-primary text-os-primary hover:bg-os-primary hover:text-os-bg">
          {state.running ? 'PAUSE' : 'RESUME'}
        </button>
        <button type="button" onClick={step} className="px-2 py-1 border border-os-border hover:border-os-primary">
          DROP
        </button>
        <button type="button" onClick={reset} className="px-2 py-1 border border-os-border hover:border-os-primary">
          RESET
        </button>
      </div>
      {state.gameOver && <div className="mt-2 text-os-error font-bold">GAME OVER</div>}
      <div className="mt-2 text-[10px] text-os-dim">Controls: Arrow keys + Space</div>
    </div>
  );
};

export const PongApp: React.FC<AppProps & { compact?: boolean }> = ({ showStatus, compact = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runningRef = useRef(true);
  const keysRef = useRef({ up: false, down: false });
  const playerY = useRef(90);
  const aiY = useRef(90);
  const ball = useRef({ x: 180, y: 110, vx: 3, vy: 2 });
  const [running, setRunning] = useState(true);
  const [score, setScore] = useState({ player: 0, ai: 0 });

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') keysRef.current.up = true;
      if (event.key === 'ArrowDown') keysRef.current.down = true;
    };
    const onUp = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') keysRef.current.up = false;
      if (event.key === 'ArrowDown') keysRef.current.down = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = compact ? 300 : 460;
    const height = compact ? 180 : 260;
    canvas.width = width;
    canvas.height = height;

    const resetBall = (toPlayer: boolean) => {
      ball.current.x = width / 2;
      ball.current.y = height / 2;
      ball.current.vx = toPlayer ? -3 : 3;
      ball.current.vy = (Math.random() > 0.5 ? 1 : -1) * 2;
    };

    let frameId = 0;
    const loop = () => {
      frameId = requestAnimationFrame(loop);

      if (runningRef.current) {
        if (keysRef.current.up) playerY.current = Math.max(playerY.current - 4, 0);
        if (keysRef.current.down) playerY.current = Math.min(playerY.current + 4, height - 50);

        aiY.current += ball.current.y > aiY.current + 25 ? 2.6 : -2.6;
        aiY.current = Math.max(0, Math.min(aiY.current, height - 50));

        ball.current.x += ball.current.vx;
        ball.current.y += ball.current.vy;

        if (ball.current.y <= 0 || ball.current.y >= height - 8) ball.current.vy *= -1;

        if (ball.current.x <= 16 && ball.current.y > playerY.current - 8 && ball.current.y < playerY.current + 54) {
          ball.current.vx = Math.abs(ball.current.vx);
        }
        if (ball.current.x >= width - 24 && ball.current.y > aiY.current - 8 && ball.current.y < aiY.current + 54) {
          ball.current.vx = -Math.abs(ball.current.vx);
        }

        if (ball.current.x < 0) {
          setScore((s) => ({ ...s, ai: s.ai + 1 }));
          showStatus('PONG: AI scored');
          resetBall(false);
        }
        if (ball.current.x > width) {
          setScore((s) => ({ ...s, player: s.player + 1 }));
          showStatus('PONG: You scored');
          resetBall(true);
        }
      }

      const accent = getPrimaryRgbFromDocument();
      const accentSoft = shadeRgb(accent, 0.84);
      const accentBright = shadeRgb(accent, 1.16);

      ctx.fillStyle = '#0C0C0E';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = rgbToCss(accent);
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = rgbToCss(accentSoft);
      ctx.fillRect(8, playerY.current, 8, 50);
      ctx.fillRect(width - 16, aiY.current, 8, 50);
      ctx.fillStyle = rgbToCss(accentBright);
      ctx.fillRect(ball.current.x, ball.current.y, 8, 8);
    };
    loop();
    return () => cancelAnimationFrame(frameId);
  }, [compact, showStatus]);

  const reset = () => {
    setScore({ player: 0, ai: 0 });
    playerY.current = 90;
    aiY.current = 90;
    ball.current = { x: compact ? 150 : 230, y: compact ? 90 : 130, vx: 3, vy: 2 };
    showStatus('PONG reset');
  };

  return (
    <div className="h-full p-3 bg-os-bg text-os-text font-mono">
      <div className="text-xs mb-2 flex justify-between">
        <span>YOU: {score.player}</span>
        <span>AI: {score.ai}</span>
      </div>
      <canvas ref={canvasRef} className="border border-os-border bg-os-bg mb-2" />
      <div className="flex gap-2 text-xs">
        <button type="button" onClick={() => setRunning((r) => !r)} className="px-2 py-1 border border-os-primary text-os-primary hover:bg-os-primary hover:text-os-bg">
          {running ? 'PAUSE' : 'RESUME'}
        </button>
        <button type="button" onClick={reset} className="px-2 py-1 border border-os-border hover:border-os-primary">
          RESET
        </button>
      </div>
      <div className="mt-2 text-[10px] text-os-dim">Controls: ArrowUp / ArrowDown</div>
    </div>
  );
};

type BrowserPage = 'home' | 'arcade' | 'tetris' | 'pong' | 'history' | 'downloads' | 'store';
interface BrowserTab {
  id: string;
  title: string;
  history: BrowserPage[];
  index: number;
  refreshTick: number;
  loading: number;
  addressInput: string;
}
interface BrowserHistoryRow {
  id: string;
  url: string;
  time: string;
}
interface BrowserDownload {
  id: string;
  name: string;
  progress: number;
  status: 'downloading' | 'completed';
}

const browserPageUrl = (page: BrowserPage) => {
  if (page === 'home') return 'https://arvion.app';
  if (page === 'arcade') return 'https://arvion.app/games';
  if (page === 'tetris') return 'https://arvion.app/games/tetris.exe';
  if (page === 'pong') return 'https://arvion.app/games/pong.exe';
  if (page === 'history') return 'https://arvion.app/history';
  if (page === 'downloads') return 'https://arvion.app/downloads';
  return 'https://arvion.app/store';
};

const resolveBrowserPage = (rawInput: string): BrowserPage => {
  const value = rawInput.trim().toLowerCase();
  if (value.includes('tetris')) return 'tetris';
  if (value.includes('pong')) return 'pong';
  if (value.includes('history')) return 'history';
  if (value.includes('download')) return 'downloads';
  if (value.includes('store') || value.includes('appstore')) return 'store';
  if (value.includes('games') || value.includes('arcade')) return 'arcade';
  return 'home';
};

export const BrowserApp: React.FC<BrowserProps> = ({ showStatus, launchWindow }) => {
  const makeTab = (page: BrowserPage = 'home'): BrowserTab => ({
    id: Math.random().toString(36).slice(2, 9),
    title: 'Tab',
    history: [page],
    index: 0,
    refreshTick: 0,
    loading: 0,
    addressInput: browserPageUrl(page),
  });
  const [tabs, setTabs] = useState<BrowserTab[]>([makeTab('arcade')]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [historyRows, setHistoryRows] = useState<BrowserHistoryRow[]>([]);
  const [historyFilter, setHistoryFilter] = useState('');
  const [bookmarks, setBookmarks] = useState<BrowserPage[]>(['home', 'arcade']);
  const [downloads, setDownloads] = useState<BrowserDownload[]>([]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const current = activeTab.history[activeTab.index];

  const setActiveTabState = (updater: (tab: BrowserTab) => BrowserTab) => {
    setTabs((prev) => prev.map((tab) => (tab.id === activeTab.id ? updater(tab) : tab)));
  };

  const simulateLoad = () => {
    setActiveTabState((tab) => ({ ...tab, loading: 15 }));
    const id = window.setInterval(() => {
      setActiveTabState((tab) => {
        const next = Math.min(tab.loading + 18, 100);
        return { ...tab, loading: next };
      });
    }, 60);
    window.setTimeout(() => {
      window.clearInterval(id);
      setActiveTabState((tab) => ({ ...tab, loading: 0 }));
    }, 450);
  };

  const pushHistoryRow = (page: BrowserPage) => {
    const url = browserPageUrl(page);
    setHistoryRows((prev) => [
      {
        id: Math.random().toString(36).slice(2, 11),
        url,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev,
    ]);
  };

  const navigate = (page: BrowserPage) => {
    setActiveTabState((tab) => {
      const history = tab.history.slice(0, tab.index + 1).concat(page);
      return {
        ...tab,
        history,
        index: history.length - 1,
        addressInput: browserPageUrl(page),
        title: page.toUpperCase(),
      };
    });
    pushHistoryRow(page);
    simulateLoad();
    showStatus(`Opened ${browserPageUrl(page)}`);
  };

  const back = () => {
    if (activeTab.index === 0) return;
    setActiveTabState((tab) => {
      const nextIndex = Math.max(tab.index - 1, 0);
      return { ...tab, index: nextIndex, addressInput: browserPageUrl(tab.history[nextIndex]) };
    });
    simulateLoad();
  };

  const forward = () => {
    if (activeTab.index >= activeTab.history.length - 1) return;
    setActiveTabState((tab) => {
      const nextIndex = Math.min(tab.index + 1, tab.history.length - 1);
      return { ...tab, index: nextIndex, addressInput: browserPageUrl(tab.history[nextIndex]) };
    });
    simulateLoad();
  };

  const refresh = () => {
    setActiveTabState((tab) => ({ ...tab, refreshTick: tab.refreshTick + 1 }));
    simulateLoad();
    showStatus(`Refreshed ${browserPageUrl(current)}`);
  };

  const goToAddress = () => {
    navigate(resolveBrowserPage(activeTab.addressInput));
  };

  const openWindowGame = (game: 'tetris' | 'pong') => {
    launchWindow({
      title: game === 'tetris' ? 'TETRIS.EXE' : 'PONG.EXE',
      render: () => (game === 'tetris' ? <TetrisApp showStatus={showStatus} /> : <PongApp showStatus={showStatus} />),
      initialSize: { width: 520, height: 640 },
    });
  };

  const addBookmark = () => {
    setBookmarks((prev) => (prev.includes(current) ? prev : [...prev, current]));
    showStatus('Bookmark added');
  };

  const startDownload = (name: string) => {
    const id = Math.random().toString(36).slice(2, 11);
    setDownloads((prev) => [...prev, { id, name, progress: 0, status: 'downloading' }]);
    const timer = window.setInterval(() => {
      setDownloads((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, progress: Math.min(item.progress + 14, 100), status: item.progress + 14 >= 100 ? 'completed' : 'downloading' }
            : item
        )
      );
    }, 120);
    window.setTimeout(() => window.clearInterval(timer), 1100);
    showStatus(`${name} downloading`);
  };

  const visibleHistory = historyRows.filter((row) => row.url.toLowerCase().includes(historyFilter.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-os-panel">
      <div className="flex items-center gap-1 p-1 border-b border-os-border bg-os-card overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTabId(tab.id)}
            className={`px-2 py-1 text-xs border ${activeTabId === tab.id ? 'border-os-primary text-os-primary bg-os-primarySoft' : 'border-os-border hover:border-os-primary'}`}
          >
            {tab.title}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const tab = makeTab('home');
            setTabs((prev) => [...prev, tab]);
            setActiveTabId(tab.id);
          }}
          className="px-2 py-1 text-xs border border-os-border hover:border-os-primary"
        >
          +
        </button>
        {tabs.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setTabs((prev) => prev.filter((tab) => tab.id !== activeTab.id));
              const next = tabs.find((tab) => tab.id !== activeTab.id);
              if (next) setActiveTabId(next.id);
            }}
            className="px-2 py-1 text-xs border border-os-border hover:border-os-primary"
          >
            CLOSE TAB
          </button>
        )}
      </div>
      <div className="h-1 bg-os-bg">
        <div className="h-full bg-os-primary transition-all" style={{ width: `${activeTab.loading}%` }} />
      </div>
      <div className="flex items-center gap-2 p-2 border-b border-os-border bg-os-card">
        <button type="button" onClick={() => navigate('home')} className="p-1 px-2 hover:bg-os-bg rounded text-os-dim">HOME</button>
        <button type="button" disabled={activeTab.index === 0} onClick={back} className="p-1 px-2 hover:bg-os-bg rounded text-os-dim disabled:opacity-40">BACK</button>
        <button type="button" disabled={activeTab.index >= activeTab.history.length - 1} onClick={forward} className="p-1 px-2 hover:bg-os-bg rounded text-os-dim disabled:opacity-40">FWD</button>
        <button type="button" onClick={refresh} className="p-1 px-2 hover:bg-os-bg rounded text-os-dim">REFRESH</button>
        <button type="button" onClick={addBookmark} className="p-1 px-2 border border-os-border hover:border-os-primary">★</button>
        <input
          type="text"
          value={activeTab.addressInput}
          onChange={(event) => setActiveTabState((tab) => ({ ...tab, addressInput: event.target.value }))}
          onKeyDown={(event) => event.key === 'Enter' && goToAddress()}
          className="flex-1 bg-os-bg border border-os-border text-os-text px-2 py-1 font-mono text-sm outline-none"
        />
        <button type="button" onClick={goToAddress} className="p-1 px-2 border border-os-border hover:border-os-primary">GO</button>
      </div>
      <div className="px-2 py-1 border-b border-os-border bg-os-panel flex gap-1 flex-wrap">
        {bookmarks.map((bookmark) => (
          <button key={bookmark} type="button" onClick={() => navigate(bookmark)} className="px-2 py-1 text-xs border border-os-border hover:border-os-primary">
            {bookmark.toUpperCase()}
          </button>
        ))}
        <button type="button" onClick={() => navigate('history')} className="px-2 py-1 text-xs border border-os-border hover:border-os-primary">HISTORY</button>
        <button type="button" onClick={() => navigate('downloads')} className="px-2 py-1 text-xs border border-os-border hover:border-os-primary">DOWNLOADS</button>
        <button type="button" onClick={() => navigate('store')} className="px-2 py-1 text-xs border border-os-border hover:border-os-primary">APP STORE</button>
      </div>

      <div className="flex-1 p-4 bg-os-bg relative overflow-auto">
        {current === 'home' && (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <h2 className="font-8bit text-os-primary">ARVION PORTAL</h2>
            <button type="button" onClick={() => navigate('arcade')} className="px-4 py-2 border border-os-primary text-os-primary hover:bg-os-primary hover:text-os-bg">ENTER ARCADE</button>
          </div>
        )}

        {current === 'arcade' && (
          <div className="h-full flex flex-col gap-4">
            <div className="border border-os-primary bg-[radial-gradient(circle_at_top_left,rgb(var(--os-primary-rgb)/0.26),transparent_55%)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-8bit text-os-primary text-shadow-glow">ARCADE CORE</h2>
                  <p className="text-xs text-os-dim mt-1">Pick a game mode and launch directly in this tab or in a fresh window.</p>
                </div>
                <Gamepad2 size={52} className="text-os-primary animate-float" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 flex-1">
              <button
                type="button"
                onClick={() => navigate('tetris')}
                className="h-full min-h-[180px] p-4 bg-os-card border border-os-border hover:border-os-primary hover:shadow-primary-glow transition-all flex flex-col justify-between text-left"
              >
                <div>
                  <div className="text-[10px] text-os-dim mb-2">ARCADE SLOT 01</div>
                  <div className="flex items-center gap-3"><Box size={28} className="text-os-success" /><span className="font-bold text-os-primary">TETRIS.EXE</span></div>
                </div>
                <div className="text-xs text-os-dim">Stack blocks. Clear lines. Climb score tiers.</div>
              </button>

              <button
                type="button"
                onClick={() => navigate('pong')}
                className="h-full min-h-[180px] p-4 bg-os-card border border-os-border hover:border-os-primary hover:shadow-primary-glow transition-all flex flex-col justify-between text-left"
              >
                <div>
                  <div className="text-[10px] text-os-dim mb-2">ARCADE SLOT 02</div>
                  <div className="flex items-center gap-3"><Activity size={28} className="text-os-warning" /><span className="font-bold text-os-primary">PONG.EXE</span></div>
                </div>
                <div className="text-xs text-os-dim">Fast rally mode with reaction-speed scoring.</div>
              </button>

              <div className="h-full min-h-[180px] p-4 bg-os-card border border-os-border flex flex-col justify-between">
                <div>
                  <div className="text-[10px] text-os-dim mb-2">ARCADE OPS</div>
                  <div className="text-sm font-bold text-os-primary">Quick Launch</div>
                </div>
                <div className="space-y-2 text-xs">
                  <button type="button" onClick={() => openWindowGame('tetris')} className="w-full px-2 py-1 border border-os-border hover:border-os-primary">Open Tetris Window</button>
                  <button type="button" onClick={() => openWindowGame('pong')} className="w-full px-2 py-1 border border-os-border hover:border-os-primary">Open Pong Window</button>
                  <button type="button" onClick={() => startDownload(`arcade_bundle_${Date.now().toString().slice(-4)}.zip`)} className="w-full px-2 py-1 border border-os-border hover:border-os-primary">Export Arcade Bundle</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {current === 'tetris' && (
          <div className="h-full flex flex-col">
            <div className="mb-2 flex justify-between items-center">
              <span className="text-os-primary font-bold">TETRIS.EXE</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => navigate('arcade')} className="px-2 py-1 border border-os-border hover:border-os-primary">BACK TO ARCADE</button>
                <button type="button" onClick={() => startDownload('tetris_save.dat')} className="px-2 py-1 border border-os-border hover:border-os-primary">DOWNLOAD SAVE</button>
                <button type="button" onClick={() => openWindowGame('tetris')} className="px-2 py-1 border border-os-border hover:border-os-primary">OPEN IN NEW WINDOW</button>
              </div>
            </div>
            <div className="flex-1 flex items-start justify-center">
              <TetrisApp key={`tetris-${activeTab.refreshTick}`} showStatus={showStatus} compact />
            </div>
          </div>
        )}

        {current === 'pong' && (
          <div className="h-full flex flex-col">
            <div className="mb-2 flex justify-between items-center">
              <span className="text-os-primary font-bold">PONG.EXE</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => navigate('arcade')} className="px-2 py-1 border border-os-border hover:border-os-primary">BACK TO ARCADE</button>
                <button type="button" onClick={() => startDownload('pong_replay.dat')} className="px-2 py-1 border border-os-border hover:border-os-primary">DOWNLOAD REPLAY</button>
                <button type="button" onClick={() => openWindowGame('pong')} className="px-2 py-1 border border-os-border hover:border-os-primary">OPEN IN NEW WINDOW</button>
              </div>
            </div>
            <div className="flex-1 flex items-start justify-center">
              <PongApp key={`pong-${activeTab.refreshTick}`} showStatus={showStatus} compact />
            </div>
          </div>
        )}

        {current === 'history' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={historyFilter}
                onChange={(event) => setHistoryFilter(event.target.value)}
                placeholder="Filter history..."
                className="flex-1 bg-os-panel border border-os-border px-2 py-1"
              />
              <button type="button" onClick={() => setHistoryRows([])} className="px-2 py-1 border border-os-border hover:border-os-primary">CLEAR HISTORY</button>
            </div>
            <div className="space-y-1 max-h-[420px] overflow-auto">
              {visibleHistory.map((row) => (
                <button key={row.id} type="button" onClick={() => navigate(resolveBrowserPage(row.url))} className="w-full text-left border border-os-border hover:border-os-primary px-2 py-1">
                  <div className="text-xs text-os-dim">{row.time}</div>
                  <div>{row.url}</div>
                </button>
              ))}
              {visibleHistory.length === 0 && <div className="text-os-dim">No history rows.</div>}
            </div>
          </div>
        )}

        {current === 'downloads' && (
          <div className="space-y-2">
            <button type="button" onClick={() => startDownload(`asset_${Date.now().toString().slice(-4)}.zip`)} className="px-2 py-1 border border-os-border hover:border-os-primary">
              NEW DOWNLOAD
            </button>
            {downloads.map((item) => (
              <div key={item.id} className="border border-os-border p-2">
                <div className="flex justify-between text-sm"><span>{item.name}</span><span>{item.status.toUpperCase()}</span></div>
                <div className="h-2 bg-os-panel mt-1">
                  <div className="h-full bg-os-primary" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            ))}
            {downloads.length === 0 && <div className="text-os-dim">Download manager is empty.</div>}
          </div>
        )}

        {current === 'store' && (
          <div className="space-y-2">
            <h3 className="font-8bit text-os-primary text-sm">ARVION APP STORE</h3>
            {[
              { name: 'notes-pro.pkg', desc: 'Markdown extensions + linting' },
              { name: 'arcade-pack.pkg', desc: 'Extra mini games bundle' },
              { name: 'theme-pack.pkg', desc: 'Theme presets and gradients' },
            ].map((item) => (
              <div key={item.name} className="border border-os-border p-2 flex justify-between items-center">
                <div>
                  <div>{item.name}</div>
                  <div className="text-xs text-os-dim">{item.desc}</div>
                </div>
                <button type="button" onClick={() => startDownload(item.name)} className="px-2 py-1 border border-os-border hover:border-os-primary">
                  INSTALL
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const SettingsApp: React.FC<AppProps> = ({ showStatus }) => {
  const [tab, setTab] = useState<'Appearance' | 'System' | 'Network' | 'Security'>('Appearance');
  const [scanlines, setScanlines] = useState(true);
  const [flicker, setFlicker] = useState(true);
  const [accent, setAccent] = useState(DEFAULT_ACCENT_HEX);
  const [hexInput, setHexInput] = useState(DEFAULT_ACCENT_HEX);
  const [performanceMode, setPerformanceMode] = useState<'Balanced' | 'Performance' | 'Silent'>('Balanced');
  const [animationQuality, setAnimationQuality] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [latency, setLatency] = useState(24);
  const [firewallEnabled, setFirewallEnabled] = useState(true);
  const [realtimeGuard, setRealtimeGuard] = useState(true);
  const [securitySummary, setSecuritySummary] = useState('No threats detected');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [language, setLanguage] = useState<'en-US' | 'hi-IN' | 'ja-JP' | 'es-ES'>('en-US');

  const syncThemeStudio = (partial: Record<string, unknown>) => {
    const saved = localStorage.getItem('arvion_theme_studio');
    let current: Record<string, unknown> = {};
    if (saved) {
      try {
        current = JSON.parse(saved) as Record<string, unknown>;
      } catch {
        current = {};
      }
    }
    localStorage.setItem('arvion_theme_studio', JSON.stringify({ ...current, ...partial }));
  };

  const applyAccentToDocument = (hex: string) => {
    const rgb = hexToRgbTriplet(hex);
    const hover = shadeRgb(rgb, 0.86);
    const active = shadeRgb(rgb, 0.72);
    const surface = deriveThemeSurface(rgb);
    const root = document.documentElement;
    root.style.setProperty('--arvion-accent', hex);
    root.style.setProperty('--arvion-accent-soft', `${hex}22`);
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

  const setAccentEverywhere = (hex: string) => {
    setAccent(hex);
    setHexInput(hex.toUpperCase());
    applyAccentToDocument(hex);
    localStorage.setItem('arvion_theme_accent', hex);
    syncThemeStudio({ accent: hex });
  };

  useEffect(() => {
    const storedAccent = localStorage.getItem('arvion_theme_accent');
    const storedScanlines = localStorage.getItem('arvion_scanlines');
    const storedFlicker = localStorage.getItem('arvion_flicker');
    const storedQuality = localStorage.getItem('arvion_animation_quality');
    const storedReducedMotion = localStorage.getItem('arvion_reduced_motion');
    const storedHighContrast = localStorage.getItem('arvion_high_contrast');
    const storedLanguage = localStorage.getItem('arvion_language');
    if (storedAccent) {
      setAccent(storedAccent);
      setHexInput(storedAccent.toUpperCase());
      applyAccentToDocument(storedAccent);
    } else {
      applyAccentToDocument(accent);
    }
    if (storedScanlines !== null) setScanlines(storedScanlines === '1');
    if (storedFlicker !== null) setFlicker(storedFlicker === '1');
    if (storedQuality === 'LOW' || storedQuality === 'HIGH') setAnimationQuality(storedQuality);
    if (storedReducedMotion === '1') setReducedMotion(true);
    if (storedHighContrast === '1') setHighContrast(true);
    if (storedLanguage === 'hi-IN' || storedLanguage === 'ja-JP' || storedLanguage === 'es-ES') setLanguage(storedLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('no-scanlines', !scanlines);
    localStorage.setItem('arvion_scanlines', scanlines ? '1' : '0');
    syncThemeStudio({ scanline: scanlines });
  }, [scanlines]);

  useEffect(() => {
    document.documentElement.classList.toggle('no-flicker', !flicker);
    localStorage.setItem('arvion_flicker', flicker ? '1' : '0');
  }, [flicker]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
    localStorage.setItem('arvion_reduced_motion', reducedMotion ? '1' : '0');
    syncThemeStudio({ reducedMotion });
  }, [reducedMotion]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    localStorage.setItem('arvion_high_contrast', highContrast ? '1' : '0');
    syncThemeStudio({ highContrast });
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.classList.remove('animation-low', 'animation-medium', 'animation-high');
    document.documentElement.classList.add(`animation-${animationQuality.toLowerCase()}`);
    localStorage.setItem('arvion_animation_quality', animationQuality);
    syncThemeStudio({ animationQuality });
  }, [animationQuality]);

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    localStorage.setItem('arvion_language', language);
    syncThemeStudio({ language });
  }, [language]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!wifiEnabled) return;
      setLatency((prev) => Math.max(6, Math.min(120, prev + Math.floor((Math.random() - 0.5) * 8))));
    }, 1800);
    return () => window.clearInterval(timer);
  }, [wifiEnabled]);

  const apply = () => {
    setAccentEverywhere(accent);
    showStatus(`${tab} settings applied`);
  };

  const applyHexInput = () => {
    const normalized = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
    if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      showStatus('Invalid hexadecimal code. Use format #RRGGBB');
      return;
    }
    setAccentEverywhere(normalized.toUpperCase());
    showStatus(`Accent ${normalized.toUpperCase()} selected`);
  };

  const colorChoices = ['#00BFA6', '#6C8CFF', '#F14668', '#34D399', '#2A2A33', '#E6D5C3', '#A78BFA', '#22D3EE'];

  return (
    <div className="p-4 font-mono text-os-text h-full flex bg-os-panel gap-4">
      <div className="w-56 border-r border-os-border pr-4 flex flex-col gap-2">
        <div className="text-xs text-os-dim px-2 pb-2 border-b border-os-divider">CONTROL PANEL</div>
        {(['Appearance', 'System', 'Network', 'Security'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setTab(item);
              showStatus(`${item} settings opened`);
            }}
            className={`w-full text-left px-3 py-2 rounded border text-xs ${tab === item ? 'bg-os-primarySoft text-os-primary border-os-primary' : 'hover:bg-os-card text-os-dim border-os-border hover:text-os-text hover:border-os-primary'}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        <h3 className="text-xl mb-4 text-os-primary border-b border-os-divider pb-2">{tab} Settings</h3>

        {tab === 'Appearance' && (
          <div className="space-y-4">
            <div className="rounded border border-os-border p-3 bg-os-bg">
              <label className="block text-sm text-os-dim mb-2">Color Picker (Millions of Colors)</label>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="color"
                  value={accent}
                  onChange={(event) => {
                    setAccentEverywhere(event.target.value.toUpperCase());
                    showStatus(`Accent ${event.target.value.toUpperCase()} selected`);
                  }}
                  className="w-14 h-10 bg-transparent border border-os-border"
                />
                <input
                  type="text"
                  value={hexInput}
                  onChange={(event) => setHexInput(event.target.value.toUpperCase())}
                  className="bg-os-panel border border-os-border px-2 py-2 w-32"
                  placeholder="#RRGGBB"
                />
                <button type="button" onClick={applyHexInput} className="px-3 py-2 border border-os-border hover:border-os-primary">
                  APPLY HEX
                </button>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                {colorChoices.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setAccentEverywhere(color);
                      showStatus(`Accent ${color} selected`);
                    }}
                    className={`w-8 h-8 border-2 ${accent.toUpperCase() === color.toUpperCase() ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="rounded border border-os-border p-3 bg-os-bg">
              <label className="block text-sm text-os-dim mb-2">CRT Effects</label>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={scanlines} onChange={(event) => setScanlines(event.target.checked)} className="accent-os-primary" />
                <span>Enable Scanlines</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={flicker} onChange={(event) => setFlicker(event.target.checked)} className="accent-os-primary" />
                <span>Enable Flicker</span>
              </div>
            </div>

            <div className="rounded border border-os-border p-3 bg-os-bg text-xs">
              <p className="text-os-dim mb-1">ACTIVE PREVIEW</p>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full border border-os-border" style={{ backgroundColor: accent }} />
                <span className="font-bold">Accent: {accent.toUpperCase()}</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'System' && (
          <div className="space-y-4">
            <div className="rounded border border-os-border p-3 bg-os-bg">
              <label className="block text-sm text-os-dim mb-2">Performance Mode</label>
              <div className="flex gap-2 flex-wrap">
                {(['Balanced', 'Performance', 'Silent'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setPerformanceMode(mode);
                      showStatus(`Mode set to ${mode}`);
                    }}
                    className={`px-3 py-1 border ${performanceMode === mode ? 'border-os-primary text-os-primary bg-os-primarySoft' : 'border-os-border hover:border-os-primary'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded border border-os-border p-3 bg-os-bg">
              <label className="block text-sm text-os-dim mb-2">Animation Quality</label>
              <div className="flex gap-2">
                {(['LOW', 'MEDIUM', 'HIGH'] as const).map((quality) => (
                  <button
                    key={quality}
                    type="button"
                    onClick={() => setAnimationQuality(quality)}
                    className={`px-3 py-1 border ${animationQuality === quality ? 'border-os-primary text-os-primary bg-os-primarySoft' : 'border-os-border hover:border-os-primary'}`}
                  >
                    {quality}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" checked={autoUpdate} onChange={(event) => setAutoUpdate(event.target.checked)} className="accent-os-primary" />
              <span>Enable automatic updates</span>
            </div>
            <div className="rounded border border-os-border p-3 bg-os-bg space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={highContrast} onChange={(event) => setHighContrast(event.target.checked)} className="accent-os-primary" />
                <span>High Contrast</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} className="accent-os-primary" />
                <span>Reduced Motion</span>
              </label>
              <div>
                <label className="block text-sm text-os-dim mb-1">Language</label>
                <select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)} className="bg-os-bg border border-os-border px-2 py-1">
                  <option value="en-US">English</option>
                  <option value="hi-IN">Hindi</option>
                  <option value="ja-JP">Japanese</option>
                  <option value="es-ES">Spanish</option>
                </select>
              </div>
            </div>
            <button type="button" onClick={() => showStatus('Temporary files cleaned')} className="px-3 py-1 border border-os-border hover:border-os-primary">
              CLEAN TEMP FILES
            </button>
          </div>
        )}

        {tab === 'Network' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={wifiEnabled} onChange={(event) => setWifiEnabled(event.target.checked)} className="accent-os-primary" />
              <span>Wireless Adapter</span>
            </div>
            <div className="rounded border border-os-border p-3 bg-os-bg text-sm">
              <p className="text-os-dim">Status</p>
              <p className={wifiEnabled ? 'text-os-success font-bold' : 'text-os-warning font-bold'}>{wifiEnabled ? 'ONLINE' : 'OFFLINE'}</p>
              <p className="mt-1">Latency: {wifiEnabled ? `${latency} ms` : '--'}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={!wifiEnabled} onClick={() => { setLatency(8 + Math.floor(Math.random() * 35)); showStatus('Ping test complete'); }} className="px-3 py-1 border border-os-border hover:border-os-primary disabled:opacity-50">
                RUN PING TEST
              </button>
              <button type="button" disabled={!wifiEnabled} onClick={() => showStatus('Connection renewed')} className="px-3 py-1 border border-os-border hover:border-os-primary disabled:opacity-50">
                RECONNECT
              </button>
            </div>
          </div>
        )}

        {tab === 'Security' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={firewallEnabled} onChange={(event) => setFirewallEnabled(event.target.checked)} className="accent-os-primary" />
              <span>Firewall</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={realtimeGuard} onChange={(event) => setRealtimeGuard(event.target.checked)} className="accent-os-primary" />
              <span>Realtime Guard</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const threats = Math.random() > 0.85 ? 1 : 0;
                setSecuritySummary(threats ? '1 suspicious file quarantined' : 'No threats detected');
                showStatus(threats ? 'Threat quarantined' : 'Quick scan clean');
              }}
              className="px-3 py-1 border border-os-warning text-os-warning hover:bg-os-warning hover:text-os-bg"
            >
              RUN QUICK SCAN
            </button>
            <div className="rounded border border-os-border p-3 bg-os-bg text-sm">
              <p className="text-os-dim mb-1">Last scan summary</p>
              <p>{securitySummary}</p>
            </div>
          </div>
        )}

        <button type="button" onClick={apply} className="mt-5 px-4 py-2 bg-os-primary text-os-bg hover:bg-os-primaryHover transition-colors text-sm font-bold">
          APPLY AND SYNC SYSTEM
        </button>
      </div>
    </div>
  );
};

export const NotepadApp: React.FC<AppProps> = ({ showStatus }) => {
  type NoteVersion = { timestamp: string; content: string };
  type NoteTab = { id: string; title: string; content: string; versions: NoteVersion[] };
  const makeTab = (label = 'Untitled'): NoteTab => ({
    id: Math.random().toString(36).slice(2, 9),
    title: label,
    content: '',
    versions: [],
  });
  const [tabs, setTabs] = useState<NoteTab[]>(() => {
    const saved = localStorage.getItem('arvion_notepad_tabs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as NoteTab[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // ignore invalid saved state
      }
    }
    return [
      {
        id: 'main',
        title: 'main.md',
        content: '## ARVION NOTES\n\n- System running optimally.\n- POWERED BY Y7X\n- Use **markdown preview** mode.',
        versions: [],
      },
    ];
  });
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? 'main');
  const [previewMode, setPreviewMode] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [versionIndex, setVersionIndex] = useState<number>(-1);

  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  const updateActiveContent = (nextContent: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTab.id
          ? {
              ...tab,
              content: nextContent,
            }
          : tab
      )
    );
  };

  const saveSnapshot = (manual = false) => {
    const timestamp = new Date().toLocaleString();
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTab.id
          ? {
              ...tab,
              versions: [{ timestamp, content: tab.content }, ...tab.versions].slice(0, 20),
            }
          : tab
      )
    );
    showStatus(manual ? 'Snapshot saved' : 'Autosaved');
  };

  useEffect(() => {
    const autosave = window.setInterval(() => {
      saveSnapshot(false);
    }, 12000);
    return () => window.clearInterval(autosave);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, activeTab?.content]);

  useEffect(() => {
    localStorage.setItem('arvion_notepad_tabs', JSON.stringify(tabs));
  }, [tabs]);

  const exportFile = () => {
    const blob = new Blob([activeTab.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab.title || 'arvion_note'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('Note exported');
  };

  const insertTimestamp = () => {
    updateActiveContent(`${activeTab.content}\n[${new Date().toLocaleString()}]`);
    showStatus('Timestamp inserted');
  };

  const applyFindReplace = () => {
    if (!findText) return;
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const replaced = activeTab.content.replace(new RegExp(escaped, 'gi'), replaceText);
    updateActiveContent(replaced);
    showStatus('Find/replace complete');
  };

  const renderMarkdown = (raw: string) =>
    raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br />');

  return (
    <div className="flex flex-col h-full bg-os-bg">
      <div className="flex gap-1 p-1 border-b border-os-border bg-os-panel text-xs flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveId(tab.id);
              setVersionIndex(-1);
            }}
            className={`px-2 py-1 border ${activeId === tab.id ? 'border-os-primary text-os-primary bg-os-primarySoft' : 'border-os-border hover:border-os-primary'}`}
          >
            {tab.title}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const tab = makeTab(`note_${tabs.length + 1}.md`);
            setTabs((prev) => [...prev, tab]);
            setActiveId(tab.id);
            showStatus('New tab opened');
          }}
          className="px-2 py-1 border border-os-border hover:border-os-primary"
        >
          +
        </button>
        <button type="button" onClick={() => saveSnapshot(true)} className="px-2 py-1 hover:bg-os-card hover:text-os-primary">Save</button>
        <button type="button" onClick={insertTimestamp} className="px-2 py-1 hover:bg-os-card hover:text-os-primary">Timestamp</button>
        <button type="button" onClick={() => setPreviewMode((prev) => !prev)} className="px-2 py-1 hover:bg-os-card hover:text-os-primary">
          {previewMode ? 'Editor' : 'Preview'}
        </button>
        <button type="button" onClick={exportFile} className="px-2 py-1 hover:bg-os-card hover:text-os-primary">Export</button>
        <select
          value={versionIndex}
          onChange={(event) => {
            const index = Number(event.target.value);
            setVersionIndex(index);
            if (index >= 0 && activeTab.versions[index]) {
              updateActiveContent(activeTab.versions[index].content);
              showStatus('Version restored');
            }
          }}
          className="bg-os-bg border border-os-border px-1"
        >
          <option value={-1}>History</option>
          {activeTab.versions.map((version, idx) => (
            <option key={`${version.timestamp}-${idx}`} value={idx}>
              {version.timestamp}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 p-1 border-b border-os-border bg-os-panel text-xs">
        <input value={findText} onChange={(event) => setFindText(event.target.value)} placeholder="Find..." className="bg-os-bg border border-os-border px-2 py-1 flex-1" />
        <input value={replaceText} onChange={(event) => setReplaceText(event.target.value)} placeholder="Replace..." className="bg-os-bg border border-os-border px-2 py-1 flex-1" />
        <button type="button" onClick={applyFindReplace} className="px-2 py-1 border border-os-border hover:border-os-primary">Apply</button>
      </div>
      {!previewMode ? (
        <textarea
          className="flex-1 bg-transparent text-os-text p-2 font-mono outline-none resize-none"
          value={activeTab.content}
          onChange={(event) => updateActiveContent(event.target.value)}
          spellCheck={false}
        />
      ) : (
        <div className="flex-1 overflow-auto p-3 prose prose-invert max-w-none text-sm">
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(activeTab.content) }} />
        </div>
      )}
    </div>
  );
};
export const CalculatorApp: React.FC<AppProps> = ({ showStatus }) => {
  const [display, setDisplay] = useState('0');

  const press = (value: string) => {
    if (value === 'C') {
      setDisplay('0');
      return;
    }
    if (value === 'DEL') {
      setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }
    if (value === '=') {
      try {
        if (!/^[0-9+\-*/.() ]+$/.test(display)) throw new Error('Invalid expression');
        const result = Function(`"use strict"; return (${display})`)();
        setDisplay(String(result));
        showStatus('Calculation complete');
      } catch {
        setDisplay('ERROR');
        showStatus('Invalid calculation');
      }
      return;
    }
    setDisplay((prev) => (prev === '0' || prev === 'ERROR' ? value : `${prev}${value}`));
  };

  const buttons = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+', 'C', 'DEL'];

  return (
    <div className="p-4 bg-os-panel h-full flex flex-col">
      <div className="bg-os-bg border-2 border-os-border p-2 mb-4 text-right text-2xl font-mono text-os-primary shadow-inner min-h-12">
        {display}
      </div>
      <div className="grid grid-cols-4 gap-2 flex-1">
        {buttons.map((btn) => (
          <button
            type="button"
            key={btn}
            onClick={() => press(btn)}
            className={`bg-os-card border border-os-border hover:bg-os-primary hover:text-os-bg hover:border-os-primary transition-colors font-bold text-lg ${
              btn === '=' ? 'bg-os-primarySoft text-os-primary border-os-primary' : 'text-os-text'
            } ${btn === 'C' || btn === 'DEL' ? 'col-span-2 text-red-500 hover:text-red-500' : ''}`}
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
};

export const MonitorApp: React.FC<AppProps> = ({ showStatus }) => {
  const [processes, setProcesses] = useState([
    { name: 'SYSTEM.EXE', cpu: 12, mem: 45 },
    { name: 'DESKTOP.UI', cpu: 4, mem: 120 },
    { name: 'MATRIX_RAIN.SYS', cpu: 8, mem: 32 },
    { name: 'UNKNOWN_PROCESS', cpu: 45, mem: 512 },
  ]);
  const [sortBy, setSortBy] = useState<'cpu' | 'mem'>('cpu');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [cpuHistory, setCpuHistory] = useState<number[]>(() => Array.from({ length: 36 }, () => 42));
  const [memoryHistory, setMemoryHistory] = useState<number[]>(() => Array.from({ length: 36 }, () => 34));

  const summarizeLoad = (entries: Array<{ name: string; cpu: number; mem: number }>) => ({
    cpu: Math.min(99, entries.reduce((acc, item) => acc + item.cpu, 0)),
    memory: Math.min(99, Math.floor(entries.reduce((acc, item) => acc + item.mem, 0) / 10)),
  });

  const refresh = (silent = false) => {
    setProcesses((prev) => {
      const next = prev.map((p) => ({
        ...p,
        cpu: Math.max(1, Math.min(95, p.cpu + Math.floor((Math.random() - 0.5) * 12))),
        mem: Math.max(8, p.mem + Math.floor((Math.random() - 0.5) * 30)),
      }));
      const load = summarizeLoad(next);
      setCpuHistory((history) => [...history.slice(-35), load.cpu]);
      setMemoryHistory((history) => [...history.slice(-35), load.memory]);
      return next;
    });
    if (!silent) showStatus('Task list refreshed');
  };

  const killUnknown = () => {
    setProcesses((prev) => prev.filter((p) => p.name !== 'UNKNOWN_PROCESS'));
    showStatus('UNKNOWN_PROCESS terminated');
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => refresh(true), 1800);
    return () => window.clearInterval(interval);
  }, [autoRefresh]);

  const sortedProcesses = useMemo(() => {
    const rank = sortBy === 'cpu' ? 'cpu' : 'mem';
    return [...processes].sort((a, b) => b[rank] - a[rank]);
  }, [processes, sortBy]);

  const totals = summarizeLoad(processes);
  const cpuTotal = totals.cpu;
  const memTotal = totals.memory;
  const hasUnknown = processes.some((process) => process.name === 'UNKNOWN_PROCESS');

  const toLinePath = (values: number[], width: number, height: number) => {
    if (!values.length) return '';
    return values.map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - (value / 100) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
  };

  const toAreaPath = (values: number[], width: number, height: number) => {
    if (!values.length) return '';
    const line = toLinePath(values, width, height);
    return `${line} L${width} ${height} L0 ${height} Z`;
  };

  return (
    <div className="p-4 bg-os-panel h-full flex flex-col font-mono text-sm">
      <div className="flex gap-2 mb-2">
        <button type="button" onClick={refresh} className="px-2 py-1 text-xs border border-os-border hover:border-os-primary">
          REFRESH
        </button>
        <button
          type="button"
          onClick={() => {
            setSortBy((prev) => (prev === 'cpu' ? 'mem' : 'cpu'));
            showStatus(`Sorted by ${sortBy === 'cpu' ? 'memory' : 'cpu'}`);
          }}
          className="px-2 py-1 text-xs border border-os-border hover:border-os-primary"
        >
          SORT BY: {sortBy.toUpperCase()}
        </button>
        <button
          type="button"
          onClick={() => {
            setAutoRefresh((prev) => !prev);
            showStatus(`Auto refresh ${!autoRefresh ? 'enabled' : 'disabled'}`);
          }}
          className={`px-2 py-1 text-xs border ${autoRefresh ? 'border-os-primary text-os-primary' : 'border-os-border hover:border-os-primary'}`}
        >
          {autoRefresh ? 'AUTO REFRESH ON' : 'AUTO REFRESH OFF'}
        </button>
        <button
          type="button"
          disabled={!hasUnknown}
          onClick={killUnknown}
          className="px-2 py-1 text-xs border border-os-warning text-os-warning hover:bg-os-warning hover:text-os-bg disabled:opacity-50"
        >
          TERMINATE UNKNOWN PROCESS
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="border border-os-border bg-os-bg p-2">
          <div className="flex justify-between text-[11px] text-os-dim mb-1">
            <span>CPU Usage</span>
            <span>{cpuTotal}%</span>
          </div>
          <svg viewBox="0 0 320 80" className="w-full h-20 border border-os-border bg-os-panel">
            <path d={toAreaPath(cpuHistory, 320, 80)} fill="rgb(var(--os-primary-rgb) / 0.16)" />
            <path d={toLinePath(cpuHistory, 320, 80)} fill="none" stroke="rgb(var(--os-primary-rgb))" strokeWidth="2" />
          </svg>
        </div>
        <div className="border border-os-border bg-os-bg p-2">
          <div className="flex justify-between text-[11px] text-os-dim mb-1">
            <span>Memory Usage</span>
            <span>{memTotal}%</span>
          </div>
          <svg viewBox="0 0 320 80" className="w-full h-20 border border-os-border bg-os-panel">
            <path d={toAreaPath(memoryHistory, 320, 80)} fill="rgba(216, 58, 86, 0.14)" />
            <path d={toLinePath(memoryHistory, 320, 80)} fill="none" stroke="#D83A56" strokeWidth="2" />
          </svg>
        </div>
      </div>
      <div className="flex justify-between mb-2 text-os-dim text-xs">
        <span>PROCESS</span>
        <span>CPU</span>
        <span>MEMORY</span>
      </div>
      <div className="flex-1 overflow-auto border border-os-border bg-os-bg p-2 space-y-1">
        {sortedProcesses.map((p) => (
          <div key={p.name} className={`flex justify-between ${p.name === 'UNKNOWN_PROCESS' ? 'text-os-warning' : p.name === 'SYSTEM.EXE' ? 'text-os-primary' : 'text-os-text'}`}>
            <span>{p.name}</span>
            <span>{p.cpu}%</span>
            <span>{p.mem} MB</span>
          </div>
        ))}
      </div>
    </div>
  );
};

type StartupItem = {
  id: string;
  name: string;
  enabled: boolean;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
};

const defaultStartupItems: StartupItem[] = [
  { id: 'desktop-shell', name: 'Desktop Shell', enabled: true, impact: 'LOW' },
  { id: 'matrix-rain', name: 'Matrix Rain Renderer', enabled: true, impact: 'MEDIUM' },
  { id: 'net-guard', name: 'Network Guard', enabled: true, impact: 'LOW' },
  { id: 'media-service', name: 'Media Service', enabled: false, impact: 'MEDIUM' },
  { id: 'arcade-daemon', name: 'Arcade Daemon', enabled: false, impact: 'HIGH' },
];

export const StartupManagerApp: React.FC<AppProps> = ({ showStatus }) => {
  const [items, setItems] = useState<StartupItem[]>(() => {
    const saved = localStorage.getItem('arvion_startup_items');
    if (saved) {
      try {
        return JSON.parse(saved) as StartupItem[];
      } catch {
        return defaultStartupItems;
      }
    }
    return defaultStartupItems;
  });

  useEffect(() => {
    localStorage.setItem('arvion_startup_items', JSON.stringify(items));
  }, [items]);

  const enabledCount = items.filter((item) => item.enabled).length;

  return (
    <div className="h-full p-4 bg-os-panel text-os-text font-mono flex flex-col gap-3">
      <h2 className="font-8bit text-sm text-os-primary">STARTUP MANAGER</h2>
      <div className="text-xs text-os-dim">Enabled: {enabledCount} / {items.length}</div>
      <div className="flex-1 overflow-auto space-y-2">
        {items.map((item) => (
          <div key={item.id} className="border border-os-border bg-os-bg p-2 flex items-center justify-between">
            <div>
              <div>{item.name}</div>
              <div className="text-[10px] text-os-dim">Impact: {item.impact}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, enabled: !entry.enabled } : entry)));
                showStatus(`${item.name} ${item.enabled ? 'disabled' : 'enabled'} on startup`);
              }}
              className={`px-2 py-1 text-xs border ${item.enabled ? 'border-os-primary text-os-primary bg-os-primarySoft' : 'border-os-border hover:border-os-primary'}`}
            >
              {item.enabled ? 'ON' : 'OFF'}
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => showStatus('Startup profile saved')}
        className="px-3 py-1 border border-os-primary text-os-primary hover:bg-os-primary hover:text-os-bg"
      >
        SAVE STARTUP PROFILE
      </button>
    </div>
  );
};

type ThemeStudioState = {
  accent: string;
  glow: number;
  noise: number;
  scanline: boolean;
  animationQuality: 'LOW' | 'MEDIUM' | 'HIGH';
  highContrast: boolean;
  reducedMotion: boolean;
  language: 'en-US' | 'hi-IN' | 'ja-JP' | 'es-ES';
};

const defaultThemeStudio: ThemeStudioState = {
  accent: DEFAULT_ACCENT_HEX,
  glow: 45,
  noise: 18,
  scanline: true,
  animationQuality: 'MEDIUM',
  highContrast: false,
  reducedMotion: false,
  language: 'en-US',
};

const applyThemeStudio = (state: ThemeStudioState) => {
  const rgb = hexToRgbTriplet(state.accent);
  const hover = shadeRgb(rgb, 0.86);
  const active = shadeRgb(rgb, 0.72);
  const surface = deriveThemeSurface(rgb);
  const root = document.documentElement;
  root.style.setProperty('--arvion-accent', state.accent);
  root.style.setProperty('--arvion-accent-soft', `${state.accent}22`);
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
  root.style.setProperty('--arvion-glow-strength', String(state.glow / 100));
  root.style.setProperty('--arvion-noise-opacity', String(state.noise / 100));
  root.classList.toggle('no-scanlines', !state.scanline);
  root.classList.toggle('high-contrast', state.highContrast);
  root.classList.toggle('reduced-motion', state.reducedMotion || state.animationQuality === 'LOW');
  root.setAttribute('lang', state.language);
};

export const ThemeStudioApp: React.FC<AppProps> = ({ showStatus }) => {
  const [state, setState] = useState<ThemeStudioState>(() => {
    const saved = localStorage.getItem('arvion_theme_studio');
    if (saved) {
      try {
        return JSON.parse(saved) as ThemeStudioState;
      } catch {
        return defaultThemeStudio;
      }
    }
    return defaultThemeStudio;
  });
  const [importText, setImportText] = useState('');

  useEffect(() => {
    applyThemeStudio(state);
    localStorage.setItem('arvion_theme_studio', JSON.stringify(state));
    localStorage.setItem('arvion_theme_accent', state.accent);
    localStorage.setItem('arvion_scanlines', state.scanline ? '1' : '0');
    localStorage.setItem('arvion_animation_quality', state.animationQuality);
    localStorage.setItem('arvion_reduced_motion', state.reducedMotion ? '1' : '0');
    localStorage.setItem('arvion_language', state.language);
  }, [state]);

  const exportTheme = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arvion_theme.json';
    a.click();
    URL.revokeObjectURL(url);
    showStatus('Theme exported as JSON');
  };

  const importTheme = () => {
    try {
      const parsed = JSON.parse(importText) as ThemeStudioState;
      setState({ ...defaultThemeStudio, ...parsed });
      showStatus('Theme imported');
    } catch {
      showStatus('Invalid theme JSON');
    }
  };

  const exportBackup = () => {
    const allKeys = Object.keys(localStorage).filter((key) => key.startsWith('arvion_'));
    const payload: Record<string, string | null> = {};
    allKeys.forEach((key) => {
      payload[key] = localStorage.getItem(key);
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arvion_cloud_backup.json';
    a.click();
    URL.revokeObjectURL(url);
    showStatus('Cloud backup exported');
  };

  const importBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Record<string, string | null>;
        Object.entries(parsed).forEach(([key, value]) => {
          if (value === null) localStorage.removeItem(key);
          else localStorage.setItem(key, value);
        });
        showStatus('Cloud backup imported. Reload recommended.');
      } catch {
        showStatus('Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full p-4 bg-os-panel text-os-text font-mono overflow-auto">
      <h2 className="font-8bit text-sm text-os-primary mb-3">THEME STUDIO</h2>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <label className="flex flex-col gap-1">
          Accent
          <input type="color" value={state.accent} onChange={(event) => setState((prev) => ({ ...prev, accent: event.target.value }))} className="h-9 border border-os-border bg-os-bg" />
        </label>
        <label className="flex flex-col gap-1">
          Glow {state.glow}%
          <input type="range" min={0} max={100} value={state.glow} onChange={(event) => setState((prev) => ({ ...prev, glow: Number(event.target.value) }))} />
        </label>
        <label className="flex flex-col gap-1">
          Noise {state.noise}%
          <input type="range" min={0} max={100} value={state.noise} onChange={(event) => setState((prev) => ({ ...prev, noise: Number(event.target.value) }))} />
        </label>
        <div className="space-y-1">
          <div>Animation Quality</div>
          <div className="flex gap-1">
            {(['LOW', 'MEDIUM', 'HIGH'] as const).map((quality) => (
              <button
                key={quality}
                type="button"
                onClick={() => setState((prev) => ({ ...prev, animationQuality: quality }))}
                className={`px-2 py-1 border ${state.animationQuality === quality ? 'border-os-primary text-os-primary bg-os-primarySoft' : 'border-os-border hover:border-os-primary'}`}
              >
                {quality}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={state.scanline} onChange={(event) => setState((prev) => ({ ...prev, scanline: event.target.checked }))} />
          Scanline
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={state.highContrast} onChange={(event) => setState((prev) => ({ ...prev, highContrast: event.target.checked }))} />
          High Contrast (Accessibility)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={state.reducedMotion} onChange={(event) => setState((prev) => ({ ...prev, reducedMotion: event.target.checked }))} />
          Reduced Motion (Accessibility)
        </label>
        <label className="flex flex-col gap-1">
          Language
          <select value={state.language} onChange={(event) => setState((prev) => ({ ...prev, language: event.target.value as ThemeStudioState['language'] }))} className="bg-os-bg border border-os-border px-2 py-1">
            <option value="en-US">English</option>
            <option value="hi-IN">Hindi</option>
            <option value="ja-JP">Japanese</option>
            <option value="es-ES">Spanish</option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex gap-2 flex-wrap text-xs">
        <button type="button" onClick={exportTheme} className="px-2 py-1 border border-os-border hover:border-os-primary">Export Theme JSON</button>
        <button type="button" onClick={exportBackup} className="px-2 py-1 border border-os-border hover:border-os-primary">Export Cloud Backup</button>
        <label className="px-2 py-1 border border-os-border hover:border-os-primary cursor-pointer">
          Import Cloud Backup
          <input type="file" accept="application/json" className="hidden" onChange={importBackup} />
        </label>
      </div>
      <div className="mt-3">
        <textarea
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          placeholder="Paste theme JSON to import"
          className="w-full h-24 bg-os-bg border border-os-border p-2 text-xs"
        />
        <button type="button" onClick={importTheme} className="mt-2 px-2 py-1 border border-os-border hover:border-os-primary text-xs">Import Theme JSON</button>
      </div>
    </div>
  );
};

type LoginProfile = {
  id: string;
  name: string;
  avatar: string;
  permission: 'ADMIN' | 'STANDARD' | 'GUEST';
};

export const ProfilesApp: React.FC<AppProps> = ({ showStatus }) => {
  const [profiles, setProfiles] = useState<LoginProfile[]>(() => {
    const saved = localStorage.getItem('arvion_profiles');
    if (saved) {
      try {
        return JSON.parse(saved) as LoginProfile[];
      } catch {
        return [];
      }
    }
    return [{ id: 'default', name: 'Y7XIFIED', avatar: 'Y7', permission: 'ADMIN' }];
  });
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('A7');
  const [permission, setPermission] = useState<LoginProfile['permission']>('STANDARD');
  const [pin, setPin] = useState(() => localStorage.getItem('arvion_lock_pin') ?? '1234');

  useEffect(() => {
    localStorage.setItem('arvion_profiles', JSON.stringify(profiles));
  }, [profiles]);

  const addProfile = () => {
    if (!name.trim()) return;
    setProfiles((prev) => [...prev, { id: Math.random().toString(36).slice(2, 9), name: name.trim(), avatar: avatar.slice(0, 2).toUpperCase(), permission }]);
    setName('');
    showStatus('Profile created');
  };

  return (
    <div className="h-full p-4 bg-os-panel text-os-text font-mono overflow-auto">
      <h2 className="font-8bit text-sm text-os-primary mb-3">PROFILE MANAGER</h2>
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Profile name" className="bg-os-bg border border-os-border px-2 py-1" />
        <input value={avatar} onChange={(event) => setAvatar(event.target.value)} placeholder="Avatar text" className="bg-os-bg border border-os-border px-2 py-1" />
        <select value={permission} onChange={(event) => setPermission(event.target.value as LoginProfile['permission'])} className="bg-os-bg border border-os-border px-2 py-1">
          <option value="ADMIN">ADMIN</option>
          <option value="STANDARD">STANDARD</option>
          <option value="GUEST">GUEST</option>
        </select>
        <button type="button" onClick={addProfile} className="px-2 py-1 border border-os-border hover:border-os-primary">Add Profile</button>
      </div>

      <div className="space-y-2 mb-4">
        {profiles.map((profile) => (
          <div key={profile.id} className="border border-os-border p-2 flex items-center justify-between bg-os-bg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 border border-os-primary text-os-primary flex items-center justify-center">{profile.avatar}</div>
              <div>
                <div>{profile.name}</div>
                <div className="text-[10px] text-os-dim">{profile.permission}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('arvion_active_profile', profile.id);
                showStatus(`${profile.name} set as active profile`);
              }}
              className="px-2 py-1 text-xs border border-os-border hover:border-os-primary"
            >
              ACTIVATE
            </button>
          </div>
        ))}
      </div>

      <div className="text-xs space-y-2">
        <label className="flex items-center gap-2">
          Lock PIN
          <input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))} className="bg-os-bg border border-os-border px-2 py-1 w-24" />
        </label>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem('arvion_lock_pin', pin || '1234');
            showStatus('Lock PIN saved');
          }}
          className="px-2 py-1 border border-os-border hover:border-os-primary"
        >
          SAVE LOCK PIN
        </button>
      </div>
    </div>
  );
};

type Achievement = { id: string; title: string; unlocked: boolean; detail: string };

export const AchievementsApp: React.FC<AppProps> = ({ showStatus }) => {
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem('arvion_achievements');
    if (saved) return JSON.parse(saved) as Achievement[];
    return [
      { id: 'first-boot', title: 'First Boot', unlocked: true, detail: 'Successfully entered ARVION desktop.' },
      { id: 'tetris-1k', title: 'Tetris 1K', unlocked: false, detail: 'Score 1000 in TETRIS.EXE.' },
      { id: 'pong-5', title: 'PONG x5', unlocked: false, detail: 'Win five rounds in PONG.EXE.' },
      { id: 'app-explorer', title: 'Explorer', unlocked: false, detail: 'Open 10 different apps.' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('arvion_achievements', JSON.stringify(achievements));
  }, [achievements]);

  return (
    <div className="h-full p-4 bg-os-panel text-os-text font-mono">
      <h2 className="font-8bit text-sm text-os-primary mb-3">QUESTS & ACHIEVEMENTS</h2>
      <div className="space-y-2">
        {achievements.map((achievement) => (
          <div key={achievement.id} className={`border p-2 ${achievement.unlocked ? 'border-os-primary bg-os-primarySoft' : 'border-os-border bg-os-bg'}`}>
            <div className="flex items-center justify-between">
              <div className="font-bold">{achievement.title}</div>
              <button
                type="button"
                onClick={() => {
                  setAchievements((prev) => prev.map((item) => (item.id === achievement.id ? { ...item, unlocked: !item.unlocked } : item)));
                  showStatus(`${achievement.title} ${achievement.unlocked ? 'locked' : 'unlocked'}`);
                }}
                className="px-2 py-1 text-xs border border-os-border hover:border-os-primary"
              >
                {achievement.unlocked ? 'LOCK' : 'UNLOCK'}
              </button>
            </div>
            <div className="text-xs text-os-dim mt-1">{achievement.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
