import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Battery,
  Bell,
  Calculator,
  Edit3,
  Folder,
  Globe,
  Image as ImageIcon,
  Lock,
  Music,
  Palette,
  Rocket,
  Settings,
  ShieldAlert,
  Skull,
  Terminal as TerminalIcon,
  Trophy,
  UserCog,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Window } from './Window';
import { Terminal } from './Terminal';
import { MatrixRain } from './MatrixRain';
import { GlitchText } from './GlitchText';
import {
  AchievementsApp,
  BrowserApp,
  CalculatorApp,
  FilesApp,
  LaunchWindow,
  MonitorApp,
  MusicApp,
  NotepadApp,
  ProfilesApp,
  SecurityApp,
  SettingsApp,
  StartupManagerApp,
  ThemeStudioApp,
} from './DesktopApps';

interface DesktopProps {
  onLogout: () => void;
}

interface AppWindow {
  id: string;
  title: string;
  appName: string;
  component: React.ReactNode;
  initialPosition: { x: number; y: number };
  initialSize: { width: number | string; height: number | string };
  isActive: boolean;
  isMinimized: boolean;
  workspace: number;
}

interface WindowConfig {
  title: string;
  appName: string;
  render: (windowId: string) => React.ReactNode;
  initialSize: { width: number | string; height: number | string };
  fullscreen?: boolean;
}

interface DesktopApp {
  name: string;
  icon: React.ReactNode;
  launch: () => void;
}

interface DesktopNotification {
  id: string;
  title: string;
  detail: string;
  read: boolean;
  time: string;
}

interface IconGroup {
  id: string;
  name: string;
  apps: string[];
}

type QuickPanel = 'audio' | 'battery' | 'notifications' | 'calendar';
type UiSound =
  | 'tap'
  | 'open'
  | 'close'
  | 'minimize'
  | 'workspace'
  | 'toggleOn'
  | 'toggleOff'
  | 'notify'
  | 'success'
  | 'error'
  | 'panel'
  | 'drag'
  | 'characterJump'
  | 'characterCoin'
  | 'widget'
  | 'alarm'
  | 'staticBurst'
  | 'shutdown';

interface TaskbarCharacter {
  id: string;
  glyph: string;
  name: string;
  x: number;
  direction: 1 | -1;
  speed: number;
  jumpUntil: number;
}

const DEFAULT_ORDER = [
  'Terminal', 'Files', 'Security', 'Music', 'Browser', 'Settings', 'Notepad',
  'Calculator', 'Monitor', 'Startup', 'Theme Studio', 'Profiles', 'Achievements', 'BSOD'
];

const DEFAULT_GROUPS: IconGroup[] = [
  { id: 'g1', name: 'SETTINGS', apps: ['Settings', 'Startup', 'Profiles', 'Monitor'] },
  { id: 'g2', name: 'ARCADE', apps: ['Browser', 'Achievements'] },
];

const WEATHER_TEXT = ['Clear', 'Cloudy', 'Haze', 'Rain'];
const BSOD_ALERT_LINES = [
  'KERNEL STACK CORRUPTION DETECTED',
  'ROOT PROCESS SIGNATURE MISMATCH',
  'DMA OVERFLOW @ BUS 0x19A',
  'MEMORY REGION LOCKDOWN FAILED',
  'CRITICAL WATCHDOG TRIGGERED',
  'GRAPHICS INTERRUPT STORM ACTIVE',
  'IO CONTROLLER DESYNC WARNING',
  'VIRTUALIZATION BARRIER BREACHED',
  'SECURE BOOT CHAIN INVALID',
  'SYSTEM CLOCK INTEGRITY LOST',
];
const WORKSPACE_NAMES: Record<number, string> = {
  1: 'Workspace One',
  2: 'Workspace Two',
  3: 'Workspace Three',
};
const KONAMI_SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

const STATUS_EXPANSIONS: Array<[RegExp, string]> = [
  [/\bDND\b/g, 'Do Not Disturb'],
  [/\bMIN\b/g, 'Minimized'],
  [/\bAUTO\b/g, 'Automatic'],
  [/\bHEX\b/g, 'Hexadecimal'],
  [/\bJSON\b/g, 'JavaScript Object Notation'],
  [/\bUNKNOWN_PROCESS\b/g, 'Unknown Process'],
  [/\bTASK_MGR\b/g, 'Task Manager'],
  [/\bSTARTUP_MANAGER\b/g, 'Startup Manager'],
];

const expandStatusMessage = (message: string) => {
  const expanded = STATUS_EXPANSIONS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), message);
  return expanded.replace(/\bWS(\d)\b/g, (_, index: string) => WORKSPACE_NAMES[Number(index)] ?? `Workspace ${index}`);
};

export const Desktop: React.FC<DesktopProps> = ({ onLogout }) => {
  const locale = localStorage.getItem('arvion_language') || 'en-US';
  const [windows, setWindows] = useState<AppWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [launcherQuery, setLauncherQuery] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState(1);
  const [appOrder, setAppOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('arvion_app_order');
    const raw = saved ? (JSON.parse(saved) as string[]) : DEFAULT_ORDER;
    const normalized = raw
      .map((name) => {
        if (name === 'BSOD Test') return 'BSOD';
        if (name === 'System') return 'Settings';
        return name;
      })
      .filter(Boolean);
    const allowed = new Set(DEFAULT_ORDER);
    const seen = new Set<string>();
    return normalized.filter((name) => {
      if (!allowed.has(name) || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  });
  const [groups, setGroups] = useState<IconGroup[]>(() => {
    const saved = localStorage.getItem('arvion_icon_groups');
    if (!saved) return DEFAULT_GROUPS;
    const allowed = new Set(DEFAULT_ORDER);
    const parsed = JSON.parse(saved) as IconGroup[];
    return parsed
      .map((group) => ({
        ...group,
        name: group.name === 'SYSTEM' ? 'SETTINGS' : group.name,
        apps: group.apps
          .map((name) => {
            if (name === 'System') return 'Settings';
            if (name === 'BSOD Test') return 'BSOD';
            return name;
          })
          .filter((name) => allowed.has(name)),
      }))
      .filter((group) => group.apps.length > 0);
  });
  const [draggedAppName, setDraggedAppName] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState({ x: 0, y: 0, visible: false });
  const [taskbarContextMenu, setTaskbarContextMenu] = useState({ x: 0, y: 0, visible: false });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeQuickPanel, setActiveQuickPanel] = useState<QuickPanel | null>(null);
  const [volume, setVolume] = useState(78);
  const [isMuted, setIsMuted] = useState(false);
  const [appVolumes, setAppVolumes] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('arvion_app_volumes');
    return saved ? (JSON.parse(saved) as Record<string, number>) : { Terminal: 70, Browser: 66, Music: 82, Settings: 60 };
  });
  const [batteryLevel, setBatteryLevel] = useState(58);
  const [batteryCharging, setBatteryCharging] = useState(false);
  const [powerMode, setPowerMode] = useState<'Balanced' | 'Performance' | 'Saver'>('Balanced');
  const [animationQuality, setAnimationQuality] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(() => {
    const saved = localStorage.getItem('arvion_animation_quality');
    return saved === 'LOW' || saved === 'HIGH' ? saved : 'MEDIUM';
  });
  const [batterySaverAuto, setBatterySaverAuto] = useState(() => localStorage.getItem('arvion_battery_saver_auto') === '1');
  const [doNotDisturb, setDoNotDisturb] = useState(() => localStorage.getItem('arvion_dnd') === '1');
  const [notifications, setNotifications] = useState<DesktopNotification[]>(() => {
    const saved = localStorage.getItem('arvion_notifications');
    if (saved) return JSON.parse(saved) as DesktopNotification[];
    return [{ id: 'boot', title: 'System Ready', detail: 'ARVION desktop initialized.', read: false, time: new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) }];
  });
  const [weather, setWeather] = useState({ temp: 29, text: 'Clear', humidity: 44 });

  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isCrashLocked, setIsCrashLocked] = useState(() => localStorage.getItem('arvion_fatal_lock') === '1');
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => localStorage.getItem('arvion_sound_enabled') !== '0');
  const [charactersEnabled, setCharactersEnabled] = useState(() => localStorage.getItem('arvion_characters_enabled') !== '0');
  const [characterScore, setCharacterScore] = useState(0);
  const [sparkX, setSparkX] = useState(50);
  const [characters, setCharacters] = useState<TaskbarCharacter[]>([
    { id: 'char-a', glyph: 'A7', name: 'Astra', x: 16, direction: 1, speed: 1.3, jumpUntil: 0 },
    { id: 'char-b', glyph: 'R9', name: 'Rift', x: 73, direction: -1, speed: 1.5, jumpUntil: 0 },
    { id: 'char-c', glyph: 'K4', name: 'Kilo', x: 44, direction: 1, speed: 1.1, jumpUntil: 0 },
  ]);
  const [focusCharge, setFocusCharge] = useState(62);
  const [diceRoll, setDiceRoll] = useState(4);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [goofyOverlay, setGoofyOverlay] = useState(false);
  const [showShutdownConfirm, setShowShutdownConfirm] = useState(false);

  const startMenuRef = useRef<HTMLDivElement>(null);
  const quickPanelRef = useRef<HTMLDivElement>(null);
  const quickButtonsRef = useRef<HTMLDivElement>(null);
  const statusTimerRef = useRef<number | null>(null);
  const clickAudioContextRef = useRef<AudioContext | null>(null);
  const clickSoundGateRef = useRef<Record<string, number>>({});
  const soundEnabledRef = useRef(soundEffectsEnabled);
  const sparkXRef = useRef(sparkX);
  const sessionStartRef = useRef(Date.now());
  const saverTriggeredRef = useRef(false);
  const goofyOverlayTimerRef = useRef<number | null>(null);
  const konamiInputRef = useRef<string[]>([]);
  const brandTapRef = useRef<number[]>([]);

  const ensureAudioContext = () => {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!clickAudioContextRef.current) clickAudioContextRef.current = new AudioContextClass();
    return clickAudioContextRef.current;
  };

  const playTone = (
    context: AudioContext,
    options: {
      type?: OscillatorType;
      startHz: number;
      endHz?: number;
      duration: number;
      gain: number;
      delay?: number;
    }
  ) => {
    const now = context.currentTime + (options.delay ?? 0);
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = options.type ?? 'triangle';
    osc.frequency.setValueAtTime(options.startHz, now);
    if (options.endHz) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, options.endHz), now + options.duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(options.gain, now + Math.min(0.02, options.duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(now);
    osc.stop(now + options.duration + 0.01);
  };

  const playUiSound = (kind: UiSound, intensity = 1) => {
    if (!soundEnabledRef.current) return;
    const nowMs = performance.now();
    const gateKey = kind;
    const lastMs = clickSoundGateRef.current[gateKey] ?? 0;
    if (nowMs - lastMs < 32) return;
    clickSoundGateRef.current[gateKey] = nowMs;
    const context = ensureAudioContext();
    if (!context) return;
    if (context.state === 'suspended') context.resume().catch(() => undefined);
    const volumeScale = Math.max(0.18, Math.min(1, (isMuted ? 0 : volume) / 100));
    const g = 0.022 * volumeScale * intensity;
    switch (kind) {
      case 'tap':
        playTone(context, { type: 'triangle', startHz: 980, endHz: 760, duration: 0.05, gain: g * 0.65 });
        break;
      case 'open':
        playTone(context, { type: 'triangle', startHz: 420, endHz: 680, duration: 0.07, gain: g });
        playTone(context, { type: 'sine', startHz: 700, endHz: 980, duration: 0.08, gain: g * 0.72, delay: 0.04 });
        break;
      case 'close':
        playTone(context, { type: 'triangle', startHz: 680, endHz: 320, duration: 0.08, gain: g });
        break;
      case 'minimize':
        playTone(context, { type: 'sine', startHz: 640, endHz: 420, duration: 0.06, gain: g * 0.85 });
        break;
      case 'workspace':
        playTone(context, { type: 'triangle', startHz: 540, endHz: 760, duration: 0.05, gain: g * 0.9 });
        playTone(context, { type: 'triangle', startHz: 760, endHz: 540, duration: 0.05, gain: g * 0.55, delay: 0.06 });
        break;
      case 'toggleOn':
        playTone(context, { type: 'sine', startHz: 620, endHz: 960, duration: 0.08, gain: g * 0.9 });
        break;
      case 'toggleOff':
        playTone(context, { type: 'sine', startHz: 920, endHz: 520, duration: 0.08, gain: g * 0.9 });
        break;
      case 'notify':
        playTone(context, { type: 'triangle', startHz: 880, endHz: 1120, duration: 0.09, gain: g * 0.85 });
        playTone(context, { type: 'sine', startHz: 1170, endHz: 980, duration: 0.1, gain: g * 0.55, delay: 0.05 });
        break;
      case 'success':
        playTone(context, { type: 'sine', startHz: 520, endHz: 700, duration: 0.06, gain: g * 0.85 });
        playTone(context, { type: 'sine', startHz: 700, endHz: 920, duration: 0.08, gain: g * 0.75, delay: 0.05 });
        break;
      case 'error':
        playTone(context, { type: 'square', startHz: 300, endHz: 140, duration: 0.11, gain: g * 0.85 });
        break;
      case 'panel':
        playTone(context, { type: 'triangle', startHz: 740, endHz: 840, duration: 0.05, gain: g * 0.6 });
        break;
      case 'drag':
        playTone(context, { type: 'triangle', startHz: 460, endHz: 500, duration: 0.045, gain: g * 0.48 });
        break;
      case 'characterJump':
        playTone(context, { type: 'triangle', startHz: 480, endHz: 860, duration: 0.08, gain: g * 0.9 });
        break;
      case 'characterCoin':
        playTone(context, { type: 'sine', startHz: 900, endHz: 1320, duration: 0.08, gain: g });
        playTone(context, { type: 'sine', startHz: 1320, endHz: 1760, duration: 0.06, gain: g * 0.7, delay: 0.06 });
        break;
      case 'widget':
        playTone(context, { type: 'triangle', startHz: 760, endHz: 920, duration: 0.05, gain: g * 0.72 });
        break;
      case 'alarm':
        playTone(context, { type: 'square', startHz: 410, endHz: 540, duration: 0.12, gain: g * 0.75 });
        playTone(context, { type: 'square', startHz: 540, endHz: 410, duration: 0.12, gain: g * 0.6, delay: 0.13 });
        break;
      case 'staticBurst':
        playTone(context, { type: 'sawtooth', startHz: 1800, endHz: 260, duration: 0.09, gain: g * 0.45 });
        break;
      case 'shutdown':
        playTone(context, { type: 'triangle', startHz: 420, endHz: 240, duration: 0.12, gain: g * 0.95 });
        playTone(context, { type: 'sine', startHz: 260, endHz: 120, duration: 0.17, gain: g * 0.75, delay: 0.11 });
        break;
      default:
        playTone(context, { type: 'triangle', startHz: 920, endHz: 760, duration: 0.05, gain: g * 0.65 });
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('arvion_app_order', JSON.stringify(appOrder));
    localStorage.setItem('arvion_icon_groups', JSON.stringify(groups));
    localStorage.setItem('arvion_notifications', JSON.stringify(notifications));
    localStorage.setItem('arvion_dnd', doNotDisturb ? '1' : '0');
    localStorage.setItem('arvion_app_volumes', JSON.stringify(appVolumes));
    localStorage.setItem('arvion_battery_saver_auto', batterySaverAuto ? '1' : '0');
    localStorage.setItem('arvion_animation_quality', animationQuality);
    localStorage.setItem('arvion_sound_enabled', soundEffectsEnabled ? '1' : '0');
    localStorage.setItem('arvion_characters_enabled', charactersEnabled ? '1' : '0');
  }, [appOrder, groups, notifications, doNotDisturb, appVolumes, batterySaverAuto, animationQuality, soundEffectsEnabled, charactersEnabled]);

  useEffect(() => {
    soundEnabledRef.current = soundEffectsEnabled;
  }, [soundEffectsEnabled]);

  useEffect(() => {
    sparkXRef.current = sparkX;
  }, [sparkX]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('animation-low', 'animation-medium', 'animation-high');
    root.classList.add(`animation-${animationQuality.toLowerCase()}`);
  }, [animationQuality]);

  useEffect(() => {
    const batteryInterval = window.setInterval(() => {
      setBatteryLevel((prev) => {
        if (batteryCharging) return Math.min(100, prev + 1);
        const drain = powerMode === 'Performance' ? 2 : powerMode === 'Balanced' ? 1 : 0.5;
        return Math.max(1, Math.round((prev - drain) * 10) / 10);
      });
    }, 20000);
    return () => window.clearInterval(batteryInterval);
  }, [batteryCharging, powerMode]);

  useEffect(() => {
    if (!batterySaverAuto) return;
    if (!batteryCharging && batteryLevel <= 25 && !saverTriggeredRef.current) {
      saverTriggeredRef.current = true;
      setPowerMode('Saver');
      setAnimationQuality('LOW');
      addNotification('Battery Saver', 'Automation switched to Saver mode.');
      showStatus('Battery saver automation triggered');
    }
    if (batteryLevel > 35 || batteryCharging) saverTriggeredRef.current = false;
  }, [batteryLevel, batteryCharging, batterySaverAuto]);

  useEffect(() => {
    setAnimationQuality(powerMode === 'Performance' ? 'HIGH' : powerMode === 'Balanced' ? 'MEDIUM' : 'LOW');
  }, [powerMode]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const title = ['Security', 'Updater', 'Monitor'][Math.floor(Math.random() * 3)];
      const detail = title === 'Security' ? 'Background scan completed.' : title === 'Updater' ? 'System up to date.' : 'Resource snapshot refreshed.';
      addNotification(title, detail, false);
    }, 50000);
    return () => window.clearInterval(id);
  }, [doNotDisturb]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFocusCharge((prev) => Math.max(0, prev - 1));
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!stopwatchRunning) return;
    const id = window.setInterval(() => {
      setStopwatchSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [stopwatchRunning]);

  useEffect(() => {
    if (!charactersEnabled) return;
    const id = window.setInterval(() => {
      setSparkX((prev) => Math.max(6, Math.min(94, prev + (Math.random() - 0.5) * 7)));
    }, 520);
    return () => window.clearInterval(id);
  }, [charactersEnabled]);

  useEffect(() => {
    if (!charactersEnabled) return;
    const id = window.setInterval(() => {
      setCharacters((prev) =>
        prev.map((character) => {
          let nextX = character.x + character.direction * character.speed;
          let nextDirection = character.direction;
          if (nextX <= 4) {
            nextX = 4;
            nextDirection = 1;
          } else if (nextX >= 96) {
            nextX = 96;
            nextDirection = -1;
          }
          if (Math.abs(nextX - sparkXRef.current) < 4 && Math.random() < 0.2) {
            nextDirection = (nextDirection * -1) as 1 | -1;
          }
          return { ...character, x: nextX, direction: nextDirection };
        })
      );
    }, 120);
    return () => window.clearInterval(id);
  }, [charactersEnabled]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setWeather((prev) => ({
        temp: Math.max(15, Math.min(39, prev.temp + Math.floor((Math.random() - 0.5) * 3))),
        text: WEATHER_TEXT[Math.floor(Math.random() * WEATHER_TEXT.length)],
        humidity: Math.max(24, Math.min(90, prev.humidity + Math.floor((Math.random() - 0.5) * 8))),
      }));
    }, 18000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (startMenuRef.current && !startMenuRef.current.contains(event.target as Node)) setIsStartMenuOpen(false);
      if (quickPanelRef.current && !quickPanelRef.current.contains(event.target as Node) && !quickButtonsRef.current?.contains(event.target as Node)) setActiveQuickPanel(null);
      setContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      setTaskbarContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerGoofyDesktopEgg = (source: string) => {
    setFocusCharge((prev) => Math.min(100, prev + 18));
    setCharacterScore((prev) => prev + 7);
    setDiceRoll(1 + Math.floor(Math.random() * 6));
    setGoofyOverlay(true);
    if (goofyOverlayTimerRef.current !== null) window.clearTimeout(goofyOverlayTimerRef.current);
    goofyOverlayTimerRef.current = window.setTimeout(() => setGoofyOverlay(false), 4200);
    setStatusMessage(`Goofy easter egg unlocked via ${source}`);
    if (statusTimerRef.current !== null) window.clearTimeout(statusTimerRef.current);
    statusTimerRef.current = window.setTimeout(() => setStatusMessage(null), 2200);
    const item: DesktopNotification = {
      id: `egg-${Date.now()}`,
      title: 'Goofy Mode',
      detail: `Activated by ${source}.`,
      read: doNotDisturb,
      time: new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
    };
    setNotifications((prev) => [item, ...prev].slice(0, 20));
    playUiSound('characterCoin', 1);
    playUiSound('success', 0.95);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'k' && (event.ctrlKey || event.metaKey)) || event.key === 'Meta') {
        event.preventDefault();
        setIsLauncherOpen((prev) => !prev);
        setIsStartMenuOpen(false);
      }
      if (event.key === 'F1') {
        event.preventDefault();
        setShowShortcuts((prev) => !prev);
      }
      if (event.key === 'Escape') {
        setIsLauncherOpen(false);
        setShowShortcuts(false);
        setShowShutdownConfirm(false);
        setContextMenu({ x: 0, y: 0, visible: false });
        setTaskbarContextMenu({ x: 0, y: 0, visible: false });
      }
      const normalized = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const buffer = [...konamiInputRef.current, normalized].slice(-KONAMI_SEQUENCE.length);
      konamiInputRef.current = buffer;
      if (buffer.join('|') === KONAMI_SEQUENCE.join('|')) {
        konamiInputRef.current = [];
        triggerGoofyDesktopEgg('Konami Code');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => () => {
    if (statusTimerRef.current !== null) window.clearTimeout(statusTimerRef.current);
    if (goofyOverlayTimerRef.current !== null) window.clearTimeout(goofyOverlayTimerRef.current);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest<HTMLElement>('button, a, input, select, textarea, label, [role="button"]');
      if (!interactive) return;
      const dataSound = interactive.dataset.sound as UiSound | undefined;
      if (dataSound) {
        playUiSound(dataSound);
        return;
      }
      if (interactive.matches('input[type="range"]')) {
        playUiSound('drag', 0.75);
        return;
      }
      if (interactive.closest('[data-sound-group="panel"]')) {
        playUiSound('panel', 0.8);
        return;
      }
      playUiSound('tap', 0.78);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      clickAudioContextRef.current?.close().catch(() => undefined);
      clickAudioContextRef.current = null;
    };
  }, []);

  const showStatus = (message: string) => {
    setStatusMessage(expandStatusMessage(message));
    if (statusTimerRef.current !== null) window.clearTimeout(statusTimerRef.current);
    statusTimerRef.current = window.setTimeout(() => setStatusMessage(null), 1800);
  };

  const getMenuPosition = (
    clientX: number,
    clientY: number,
    options: { width: number; height: number; preferAbove?: boolean }
  ) => {
    const padding = 8;
    const maxX = window.innerWidth - options.width - padding;
    const maxY = window.innerHeight - options.height - padding;
    const x = Math.min(Math.max(padding, clientX), Math.max(padding, maxX));
    let y = options.preferAbove ? clientY - options.height : clientY;
    if (!options.preferAbove && y > maxY) y = maxY;
    if (options.preferAbove && y > maxY) y = maxY;
    y = Math.max(padding, y);
    return { x, y, visible: true };
  };

  const addNotification = (title: string, detail: string, withSound = true) => {
    const item: DesktopNotification = {
      id: `n-${Date.now()}`,
      title,
      detail,
      read: doNotDisturb,
      time: new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
    };
    setNotifications((prev) => [item, ...prev].slice(0, 20));
    if (withSound && !doNotDisturb) playUiSound('notify', 0.85);
  };

  const resolveWindowSize = (size: number | string, axis: 'width' | 'height') => {
    if (typeof size === 'number') return size;
    if (size.includes('100vw')) return window.innerWidth;
    if (size.includes('100vh') || size.includes('calc(100vh - 48px)')) return window.innerHeight - 48;
    const parsed = Number.parseFloat(size);
    return Number.isFinite(parsed) ? parsed : axis === 'width' ? 620 : 420;
  };

  const openWindow = (config: WindowConfig) => {
    const id = Math.random().toString(36).slice(2, 11);
    const actualSize = config.fullscreen ? { width: '100vw', height: 'calc(100vh - 48px)' } : config.initialSize;
    const width = resolveWindowSize(actualSize.width, 'width');
    const height = resolveWindowSize(actualSize.height, 'height');
    const centered = config.fullscreen ? { x: 0, y: 0 } : { x: Math.max((window.innerWidth - width) / 2, 0), y: Math.max((window.innerHeight - 48 - height) / 2, 0) };

    setWindows((prev) => prev.map((w) => ({ ...w, isActive: false })).concat({
      id,
      title: config.title,
      appName: config.appName,
      component: config.render(id),
      initialPosition: { x: Math.floor(centered.x), y: Math.floor(centered.y) },
      initialSize: actualSize,
      isActive: true,
      isMinimized: false,
      workspace: currentWorkspace,
    }));
    setActiveWindowId(id);
    setIsStartMenuOpen(false);
    setActiveQuickPanel(null);
    playUiSound('open', 0.95);
    showStatus(`${config.appName} opened`);
  };

  const closeWindow = (id: string) => {
    setWindows((prev) => {
      const next = prev.filter((w) => w.id !== id);
      setActiveWindowId((p) => (p === id ? (next.length ? next[next.length - 1].id : null) : p));
      return next;
    });
    playUiSound('close', 0.95);
  };

  const focusWindow = (id: string) => {
    setWindows((prev) => prev.map((w) => ({ ...w, isActive: w.id === id, isMinimized: w.id === id ? false : w.isMinimized })));
    setActiveWindowId(id);
  };

  const minimizeWindow = (id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isMinimized: true, isActive: false } : w)));
    setActiveWindowId((p) => (p === id ? null : p));
    playUiSound('minimize', 0.85);
  };

  const showDesktop = () => {
    setWindows((prev) => prev.map((w) => (w.workspace === currentWorkspace ? { ...w, isMinimized: true, isActive: false } : w)));
    setActiveWindowId(null);
    playUiSound('minimize', 0.8);
    showStatus(`Workspace ${currentWorkspace} minimized`);
  };

  const switchWorkspace = (workspace: number) => {
    setCurrentWorkspace(workspace);
    setActiveWindowId(null);
    setIsStartMenuOpen(false);
    setActiveQuickPanel(null);
    playUiSound('workspace', 0.9);
    showStatus(`${WORKSPACE_NAMES[workspace] ?? `Workspace ${workspace}`} active`);
  };

  const toggleSoundEffects = () => {
    setSoundEffectsEnabled((prev) => {
      const next = !prev;
      soundEnabledRef.current = next;
      if (next) playUiSound('toggleOn', 0.9);
      showStatus(`Sound effects ${next ? 'enabled' : 'disabled'}`);
      return next;
    });
  };

  const toggleCharacters = () => {
    setCharactersEnabled((prev) => {
      const next = !prev;
      playUiSound(next ? 'toggleOn' : 'toggleOff', 0.92);
      showStatus(`Taskbar characters ${next ? 'enabled' : 'disabled'}`);
      return next;
    });
  };

  const rollDesktopDice = () => {
    const next = 1 + Math.floor(Math.random() * 6);
    setDiceRoll(next);
    setFocusCharge((prev) => Math.min(100, prev + next));
    playUiSound('widget', 0.9);
    showStatus(next === 6 ? 'Critical roll 6: goose protocol activated' : `Dice rolled ${next}`);
    if (next === 6) triggerGoofyDesktopEgg('Lucky Dice');
  };

  const boostFocus = () => {
    setFocusCharge((prev) => Math.min(100, prev + 12));
    playUiSound('success', 0.82);
    showStatus('Focus reactor boosted');
  };

  const toggleStopwatch = () => {
    setStopwatchRunning((prev) => {
      const next = !prev;
      playUiSound(next ? 'toggleOn' : 'toggleOff', 0.86);
      return next;
    });
  };

  const resetStopwatch = () => {
    setStopwatchRunning(false);
    setStopwatchSeconds(0);
    playUiSound('panel', 0.8);
  };

  const requestShutdown = () => {
    setIsStartMenuOpen(false);
    setActiveQuickPanel(null);
    setContextMenu({ x: 0, y: 0, visible: false });
    setTaskbarContextMenu({ x: 0, y: 0, visible: false });
    setShowShutdownConfirm(true);
    playUiSound('shutdown', 0.88);
  };

  const confirmShutdown = () => {
    setShowShutdownConfirm(false);
    playUiSound('shutdown', 1);
    window.setTimeout(() => onLogout(), 140);
  };

  const handleBrandClick = () => {
    const now = Date.now();
    const taps = [...brandTapRef.current.filter((timestamp) => now - timestamp < 1200), now];
    brandTapRef.current = taps;
    if (taps.length >= 3) {
      brandTapRef.current = [];
      triggerGoofyDesktopEgg('Brand Glyph');
    }
  };

  const interactCharacter = (characterId: string) => {
    if (!charactersEnabled) return;
    let hitSpark = false;
    setCharacters((prev) =>
      prev.map((character) => {
        if (character.id !== characterId) return character;
        hitSpark = Math.abs(character.x - sparkXRef.current) <= 8;
        return { ...character, jumpUntil: Date.now() + 480 };
      })
    );
    if (hitSpark) {
      setCharacterScore((prev) => prev + 5);
      setSparkX(10 + Math.random() * 80);
      playUiSound('characterCoin', 1);
      showStatus('Spark captured');
      return;
    }
    setCharacterScore((prev) => prev + 1);
    playUiSound('characterJump', 0.9);
  };

  const triggerFatalLock = () => {
    localStorage.setItem('arvion_fatal_lock', '1');
    setIsCrashLocked(true);
    setWindows([]);
    setIsStartMenuOpen(false);
    setActiveQuickPanel(null);
    playUiSound('alarm', 1);
  };

  const launchWindow: LaunchWindow = (config) => {
    openWindow({ title: config.title, appName: config.title, render: config.render, initialSize: config.initialSize, fullscreen: config.fullscreen });
  };

  const BsodPanicScreen: React.FC<{ onRecover: () => void; onTimeout: () => void }> = ({ onRecover, onTimeout }) => {
    const [recoveryProgress, setRecoveryProgress] = useState(0);
    const [feedOffset, setFeedOffset] = useState(0);
    const [timeLeft, setTimeLeft] = useState(24);

    useEffect(() => {
      const id = window.setInterval(() => {
        setRecoveryProgress((prev) => Math.min(100, prev + 2 + Math.floor(Math.random() * 4)));
      }, 240);
      return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
      const id = window.setInterval(() => {
        setFeedOffset((prev) => (prev + 1) % BSOD_ALERT_LINES.length);
      }, 300);
      return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
      const id = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            window.clearInterval(id);
            onTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => window.clearInterval(id);
    }, [onTimeout]);

    useEffect(() => {
      const intervalMs = timeLeft <= 7 ? 260 : 580;
      const id = window.setInterval(() => {
        playUiSound('alarm', timeLeft <= 7 ? 1 : 0.72);
        if (Math.random() > 0.62) playUiSound('staticBurst', 0.9);
      }, intervalMs);
      return () => window.clearInterval(id);
    }, [timeLeft]);

    const feed = Array.from({ length: 8 }, (_, index) => BSOD_ALERT_LINES[(feedOffset + index) % BSOD_ALERT_LINES.length]);
    const canRecover = recoveryProgress >= 42;

    return (
      <div className="relative h-full w-full overflow-hidden bg-[#040406] text-[#ff4a4a] font-mono bsod-core-shake">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,0,0,0.25),transparent_45%),radial-gradient(circle_at_82%_22%,rgba(255,70,70,0.15),transparent_40%)] pointer-events-none" />
        <div className="absolute inset-0 bsod-scanlines opacity-55 pointer-events-none" />
        <div className="absolute inset-0 bsod-flicker-layer pointer-events-none" />

        <div className="relative z-10 h-full w-full p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border border-red-500/50 bg-black/65 px-4 py-2">
            <div className="flex items-center gap-3">
              <Skull size={28} className="text-red-400 bsod-alert-pulse" />
              <div className="text-[11px] tracking-[0.2em] text-red-300">KERNEL MELTDOWN MODE</div>
            </div>
            <div className="text-[11px] text-red-100 bsod-jitter-text">REBOOT COUNTDOWN {timeLeft}s</div>
          </div>

          <div className="border border-red-500/50 bg-black/70 p-4">
            <div className="relative inline-block">
              <span className="absolute inset-0 text-red-700/70 translate-x-[2px] -translate-y-[1px] bsod-jitter-text">SYSTEM HALTED</span>
              <h1 className="relative text-5xl font-extrabold tracking-[0.08em] text-red-100 bsod-jitter-text">SYSTEM HALTED</h1>
            </div>
            <p className="mt-3 text-sm text-red-200/95">Fatal exception has escalated beyond containment. Reboot is required before timer reaches zero.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            <div className="border border-red-500/35 bg-black/55 p-3 overflow-hidden">
              <div className="text-xs uppercase tracking-[0.18em] text-red-300 mb-2">Crash Telemetry</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Core Voltage</span><span className="text-red-100 bsod-alert-pulse">UNSTABLE</span></div>
                <div className="flex justify-between"><span>Thermal Envelope</span><span className="text-red-100">{126 + feedOffset}C</span></div>
                <div className="flex justify-between"><span>Kernel Threads</span><span className="text-red-100">{390 + feedOffset * 4}</span></div>
                <div className="flex justify-between"><span>Runtime Faults</span><span className="text-red-100">{1300 + feedOffset * 17}</span></div>
              </div>
              <div className="mt-4 h-28 border border-red-500/30 bg-black/70 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,70,70,0.15)_1px,transparent_1px),linear-gradient(rgba(255,70,70,0.08)_1px,transparent_1px)] bg-[size:16px_16px]" />
                <div className="absolute left-0 bottom-0 h-full w-[2px] bg-red-300/80 bsod-alert-pulse" style={{ transform: `translateX(${(recoveryProgress % 100) * 3}px)` }} />
              </div>
            </div>

            <div className="border border-red-500/35 bg-black/55 p-3 min-h-0 overflow-hidden">
              <div className="text-xs uppercase tracking-[0.18em] text-red-300 mb-2">Failure Feed</div>
              <div className="space-y-1 text-[11px] overflow-hidden">
                {feed.map((line, index) => (
                  <div key={`${line}-${index}`} className="border border-red-500/20 bg-black/60 px-2 py-1 bsod-feed-line" style={{ animationDelay: `${index * 90}ms` }}>
                    [{String(0x4F2 + feedOffset + index).toUpperCase()}] {line}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-red-500/40 bg-black/65 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-red-200 mb-2">
              <span>Emergency Recovery Handshake</span>
              <span>{recoveryProgress}%</span>
            </div>
            <div className="h-3 border border-red-500/35 bg-black/80 mb-3">
              <div className="h-full bg-red-500/80 bsod-alert-pulse" style={{ width: `${recoveryProgress}%` }} />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={!canRecover}
                onClick={onRecover}
                className={`px-4 py-2 border text-xs font-bold tracking-widest ${canRecover ? 'border-red-300 text-red-100 hover:bg-red-600/40' : 'border-red-800 text-red-700 cursor-not-allowed'}`}
              >
                RECOVER KERNEL
              </button>
              <button type="button" onClick={onRecover} className="px-4 py-2 border border-red-400 text-xs font-bold tracking-widest text-red-200 hover:bg-red-700/40">
                FORCE REBOOT NOW
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const triggerBSOD = () => {
    playUiSound('error', 1);
    openWindow({
      title: 'FATAL_ERROR.SYS',
      appName: 'BSOD',
      fullscreen: true,
      initialSize: { width: '100vw', height: '100vh' },
      render: (id) => (
        <BsodPanicScreen
          onRecover={() => {
            closeWindow(id);
            playUiSound('success', 0.95);
            showStatus('Emergency recovery executed');
          }}
          onTimeout={() => {
            closeWindow(id);
            triggerFatalLock();
          }}
        />
      ),
    });
    showStatus('Critical failure simulation started');
  };

  const apps: DesktopApp[] = [
    { name: 'Terminal', icon: <TerminalIcon size={32} />, launch: () => openWindow({ title: 'ARVION_TERMINAL.EXE', appName: 'Terminal', initialSize: { width: 760, height: 520 }, render: (id) => <Terminal onClose={() => closeWindow(id)} /> }) },
    { name: 'Files', icon: <Folder size={32} />, launch: () => openWindow({ title: 'FILE_EXPLORER.SYS', appName: 'Files', initialSize: { width: 720, height: 470 }, render: () => <FilesApp showStatus={showStatus} /> }) },
    { name: 'Settings', icon: <Settings size={32} />, launch: () => openWindow({ title: 'CONTROL_PANEL.SYS', appName: 'Settings', initialSize: { width: 760, height: 520 }, render: () => <SettingsApp showStatus={showStatus} /> }) },
    { name: 'Security', icon: <ShieldAlert size={32} />, launch: () => openWindow({ title: 'SECURITY_CENTER.EXE', appName: 'Security', initialSize: { width: 540, height: 380 }, render: () => <SecurityApp showStatus={showStatus} /> }) },
    { name: 'Music', icon: <Music size={32} />, launch: () => openWindow({ title: 'SYNTH_PLAYER.EXE', appName: 'Music', initialSize: { width: 480, height: 560 }, render: () => <MusicApp showStatus={showStatus} /> }) },
    { name: 'Browser', icon: <Globe size={32} />, launch: () => openWindow({ title: 'NET_SURFER.EXE', appName: 'Browser', initialSize: { width: 860, height: 580 }, render: () => <BrowserApp showStatus={showStatus} launchWindow={launchWindow} /> }) },
    { name: 'Notepad', icon: <Edit3 size={32} />, launch: () => openWindow({ title: 'MEMO_PAD.TXT', appName: 'Notepad', initialSize: { width: 620, height: 510 }, render: () => <NotepadApp showStatus={showStatus} /> }) },
    { name: 'Calculator', icon: <Calculator size={32} />, launch: () => openWindow({ title: 'CALC.EXE', appName: 'Calculator', initialSize: { width: 360, height: 530 }, render: () => <CalculatorApp showStatus={showStatus} /> }) },
    { name: 'Monitor', icon: <Activity size={32} />, launch: () => openWindow({ title: 'TASK_MGR.SYS', appName: 'Monitor', initialSize: { width: 560, height: 450 }, render: () => <MonitorApp showStatus={showStatus} /> }) },
    { name: 'Startup', icon: <Rocket size={32} />, launch: () => openWindow({ title: 'STARTUP_MANAGER.APP', appName: 'Startup', initialSize: { width: 620, height: 460 }, render: () => <StartupManagerApp showStatus={showStatus} /> }) },
    { name: 'Theme Studio', icon: <Palette size={32} />, launch: () => openWindow({ title: 'THEME_STUDIO.APP', appName: 'Theme Studio', initialSize: { width: 720, height: 550 }, render: () => <ThemeStudioApp showStatus={showStatus} /> }) },
    { name: 'Profiles', icon: <UserCog size={32} />, launch: () => openWindow({ title: 'PROFILE_MANAGER.APP', appName: 'Profiles', initialSize: { width: 620, height: 500 }, render: () => <ProfilesApp showStatus={showStatus} /> }) },
    { name: 'Achievements', icon: <Trophy size={32} />, launch: () => openWindow({ title: 'QUEST_CENTER.APP', appName: 'Achievements', initialSize: { width: 620, height: 500 }, render: () => <AchievementsApp showStatus={showStatus} /> }) },
    { name: 'BSOD', icon: <Skull size={32} />, launch: triggerBSOD },
  ];

  const orderedApps = appOrder.map((name) => apps.find((app) => app.name === name)).filter((app): app is DesktopApp => Boolean(app));
  const groupedNames = new Set(groups.flatMap((group) => group.apps));
  const visibleApps = orderedApps.filter((app) => !groupedNames.has(app.name));
  const launcherApps = orderedApps.filter((app) => app.name.toLowerCase().includes(launcherQuery.toLowerCase().trim()));

  const launchByName = (name: string) => apps.find((item) => item.name === name)?.launch();

  const reorderApps = (from: string, to: string) => {
    if (from === to) return;
    setAppOrder((prev) => {
      const next = [...prev];
      const fromIndex = next.indexOf(from);
      const toIndex = next.indexOf(to);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const unreadNotifications = notifications.filter((item) => !item.read).length;
  const outputVolume = isMuted ? 0 : volume;
  const batteryEstimate = batteryCharging ? 'Charging' : `${Math.max(1, Math.round((batteryLevel / 100) * 3.5 * 10) / 10)} Hours Left`;
  const uptimeSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
  const processStat = windows.filter((w) => !w.isMinimized).length + 12;
  const fpsCap = animationQuality === 'HIGH' ? 60 : animationQuality === 'MEDIUM' ? 45 : 24;
  const stopwatchLabel = `${String(Math.floor(stopwatchSeconds / 60)).padStart(2, '0')}:${String(stopwatchSeconds % 60).padStart(2, '0')}`;

  const calendarDays = useMemo(() => {
    const monthStart = new Date(time.getFullYear(), time.getMonth(), 1);
    const daysInMonth = new Date(time.getFullYear(), time.getMonth() + 1, 0).getDate();
    const startDay = monthStart.getDay();
    const cells: Array<number | null> = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [time]);

  const activeProfile = useMemo(() => {
    const profilesRaw = localStorage.getItem('arvion_profiles');
    const profiles = profilesRaw ? (JSON.parse(profilesRaw) as Array<{ id: string; name: string; avatar: string; permission: string }>) : [];
    const activeId = localStorage.getItem('arvion_active_profile');
    return profiles.find((profile) => profile.id === activeId) ?? { name: 'Y7XIFIED', avatar: 'Y7', permission: 'ADMIN' };
  }, [time]);

  const lockPin = localStorage.getItem('arvion_lock_pin') || '1234';

  if (isCrashLocked) {
    return (
      <div className="w-full h-full bg-[#040406] text-[#ff6363] flex items-center justify-center p-6">
        <div className="w-[560px] max-w-[94vw] border border-red-500/70 bg-black/80 p-6 shadow-[0_0_40px_rgba(255,0,0,0.35)]">
          <div className="flex items-center gap-3 mb-4">
            <Skull size={32} className="text-red-400 bsod-alert-pulse" />
            <h2 className="font-8bit text-sm text-red-200">SYSTEM CRASH LOCK</h2>
          </div>
          <p className="text-sm text-red-100 mb-3">Critical failure was not recovered in time. Website is locked until restart.</p>
          <p className="text-xs text-red-300/90 mb-5">Restart now, or this session will remain unusable.</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('arvion_fatal_lock');
                setIsCrashLocked(false);
                window.location.reload();
              }}
              className="px-4 py-2 border border-red-300 text-red-100 font-bold hover:bg-red-700/40"
            >
              RESTART WEBSITE
            </button>
            <button type="button" onClick={() => window.location.reload()} className="px-4 py-2 border border-red-600 text-red-300 hover:bg-red-900/30">
              TRY RELOAD
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="w-full h-full bg-os-bg text-os-text flex items-center justify-center">
          <div className="w-[420px] max-w-[90vw] border border-os-primary bg-os-panel p-5 shadow-primary-glow text-center">
          <div className="w-16 h-16 mx-auto mb-3 border border-os-primary rounded-full flex items-center justify-center text-os-primary text-xl font-bold">{activeProfile.avatar}</div>
          <h2 className="font-8bit text-os-primary text-sm mb-1">LOCKED</h2>
          <p className="text-xs text-os-dim mb-3">{activeProfile.name} ({activeProfile.permission})</p>
          <input value={pinInput} onChange={(event) => setPinInput(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Enter PIN" className="w-full bg-os-bg border border-os-border px-3 py-2 text-center" autoFocus />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => { if (pinInput === lockPin) { setIsLocked(false); setPinInput(''); showStatus('Session unlocked'); } else { showStatus('Incorrect PIN'); } }} className="flex-1 px-3 py-2 border border-os-primary text-os-primary hover:bg-os-primary hover:text-os-bg">UNLOCK</button>
            <button type="button" onClick={requestShutdown} data-sound="shutdown" className="flex-1 px-3 py-2 border border-os-error text-os-error hover:bg-os-error hover:text-white">LOG OUT</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-os-bg text-os-text font-mono selection:bg-os-primary selection:text-os-bg" onContextMenu={(event) => { event.preventDefault(); setContextMenu(getMenuPosition(event.clientX, event.clientY, { width: 220, height: 296 })); setTaskbarContextMenu({ x: 0, y: 0, visible: false }); setIsStartMenuOpen(false); setActiveQuickPanel(null); }}>
      <div
        className="absolute inset-0 pointer-events-none bg-[size:40px_40px]"
        style={{
          backgroundImage:
            'linear-gradient(rgb(var(--os-primary-rgb) / 0.08) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--os-primary-rgb) / 0.08) 1px, transparent 1px)',
        }}
      />
      <MatrixRain className={animationQuality === 'LOW' ? 'opacity-15' : animationQuality === 'HIGH' ? 'opacity-40' : 'opacity-25'} />

      <div className="absolute top-4 left-4 flex flex-col flex-wrap max-h-[calc(100vh-60px)] gap-6 z-0">
        {visibleApps.map((app, i) => (
          <motion.div key={app.name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex flex-col items-center gap-2 cursor-pointer group w-24" onClick={app.launch} draggable onDragStart={() => setDraggedAppName(app.name)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedAppName) reorderApps(draggedAppName, app.name); setDraggedAppName(null); }} onDragEnd={() => setDraggedAppName(null)}>
            <div className="p-3 bg-os-panel/80 border border-os-border group-hover:border-os-primary group-hover:bg-os-card transition-all squircle shadow-panel-shadow group-hover:shadow-primary-glow">{React.cloneElement(app.icon as React.ReactElement, { className: 'text-os-primary' })}</div>
            <span className="font-8bit text-[10px] text-center bg-os-panel/90 px-2 py-1 rounded text-os-text border border-os-border">{app.name}</span>
          </motion.div>
        ))}

        {groups.map((group) => (
          <motion.div key={group.id} className="flex flex-col items-center gap-2 cursor-pointer group w-24" onClick={() => { const firstApp = group.apps[0]; if (firstApp) launchByName(firstApp); }} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (!draggedAppName) return; setGroups((prev) => prev.map((item) => (item.id === group.id && !item.apps.includes(draggedAppName) ? { ...item, apps: [...item.apps, draggedAppName] } : item))); setDraggedAppName(null); }}>
              <div className="p-3 bg-os-panel/80 border border-os-border group-hover:border-os-primary group-hover:bg-os-card transition-all squircle shadow-panel-shadow group-hover:shadow-primary-glow"><Folder size={32} className="text-os-primary" /></div>
            <span className="font-8bit text-[10px] text-center bg-os-panel/90 px-2 py-1 rounded text-os-text border border-os-border">{group.name}</span>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {windows.filter((windowItem) => windowItem.workspace === currentWorkspace && !windowItem.isMinimized).map((windowItem) => (
          <Window key={windowItem.id} title={windowItem.title} initialPosition={windowItem.initialPosition} initialSize={windowItem.initialSize} isActive={windowItem.isActive} onClose={() => closeWindow(windowItem.id)} onMinimize={() => minimizeWindow(windowItem.id)} onClick={() => focusWindow(windowItem.id)}>
            {windowItem.component}
          </Window>
        ))}
      </AnimatePresence>

      <AnimatePresence>{statusMessage && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-3 bottom-16 z-[60] px-3 py-2 bg-os-panel border border-os-primary text-os-primary text-xs shadow-primary-glow rounded">{statusMessage}</motion.div>)}</AnimatePresence>

      <AnimatePresence>
        {showShutdownConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[95] bg-black/65 backdrop-blur-[1px] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 12, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 8, scale: 0.98 }}
              className="w-[420px] max-w-[94vw] border border-os-primary bg-os-panel p-4 shadow-primary-glow"
              data-sound-group="panel"
            >
              <h3 className="font-8bit text-sm text-os-primary mb-3">SHUTDOWN CONFIRMATION</h3>
              <p className="text-sm text-os-text mb-1">Are you sure sure you want to shutdown?</p>
              <p className="text-xs text-os-dim mb-4">After shutdown, website stays off until you press Restart Website.</p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowShutdownConfirm(false)}
                  data-sound="toggleOff"
                  className="px-3 py-2 border border-os-border hover:border-os-primary text-xs"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={confirmShutdown}
                  data-sound="shutdown"
                  className="px-3 py-2 border border-os-error text-os-error hover:bg-os-error hover:text-white text-xs font-bold"
                >
                  YES, SHUTDOWN
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLauncherOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-24">
          <div className="w-[680px] max-w-[92vw] bg-os-panel border border-os-primary shadow-primary-glow rounded p-3">
              <input autoFocus value={launcherQuery} onChange={(event) => setLauncherQuery(event.target.value)} placeholder="Search apps..." className="w-full bg-os-bg border border-os-border px-3 py-2 outline-none text-os-text" />
              <div className="mt-2 max-h-72 overflow-auto space-y-1">{launcherApps.map((app) => (<button key={app.name} type="button" onClick={() => { app.launch(); setIsLauncherOpen(false); setLauncherQuery(''); }} className="w-full text-left px-3 py-2 border border-os-border hover:border-os-primary hover:bg-os-card">{app.name}</button>))}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShortcuts && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[80] bg-black/55 backdrop-blur-sm flex items-center justify-center">
            <div className="w-[560px] max-w-[92vw] bg-os-panel border border-os-primary rounded p-4">
              <h3 className="font-8bit text-os-primary text-sm mb-3">KEYBOARD SHORTCUTS</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-os-primary">F1</span> - Toggle this shortcuts panel</div>
                <div><span className="text-os-primary">Ctrl+K / Meta</span> - Open launcher</div>
                <div><span className="text-os-primary">Esc</span> - Close launcher/panels</div>
                <div><span className="text-os-primary">Desktop Right Click</span> - Context menu</div>
              </div>
              <button type="button" onClick={() => setShowShortcuts(false)} className="mt-4 px-3 py-1 border border-os-border hover:border-os-primary">CLOSE</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contextMenu.visible && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="absolute z-[85] w-[220px] bg-os-panel border border-os-primary rounded shadow-primary-glow p-1.5" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <div className="space-y-1.5">
              <button type="button" onClick={() => { launchByName('Terminal'); setContextMenu({ x: 0, y: 0, visible: false }); }} className="w-full text-left px-3 py-2 text-xs hover:bg-os-card">Open Terminal</button>
              <button type="button" onClick={() => { launchByName('Files'); setContextMenu({ x: 0, y: 0, visible: false }); }} className="w-full text-left px-3 py-2 text-xs hover:bg-os-card">Open Files</button>
              <button type="button" onClick={() => { launchByName('Settings'); setContextMenu({ x: 0, y: 0, visible: false }); }} className="w-full text-left px-3 py-2 text-xs hover:bg-os-card">Open Settings</button>
              <button type="button" onClick={() => { launchByName('Monitor'); setContextMenu({ x: 0, y: 0, visible: false }); }} className="w-full text-left px-3 py-2 text-xs hover:bg-os-card">Open Task Manager</button>
              <button type="button" onClick={() => { showDesktop(); setContextMenu({ x: 0, y: 0, visible: false }); }} className="w-full text-left px-3 py-2 text-xs hover:bg-os-card">Minimize Current Workspace</button>
              <button type="button" onClick={() => { setShowShortcuts(true); setContextMenu({ x: 0, y: 0, visible: false }); }} className="w-full text-left px-3 py-2 text-xs hover:bg-os-card">Keyboard Shortcuts</button>
              <button type="button" onClick={() => { const name = `GROUP_${Date.now().toString().slice(-3)}`; setGroups((prev) => [...prev, { id: `g-${Date.now()}`, name, apps: [] }]); setContextMenu({ x: 0, y: 0, visible: false }); }} className="w-full text-left px-3 py-2 text-xs hover:bg-os-card">New Desktop Group</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeQuickPanel && (
          <motion.div ref={quickPanelRef} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="absolute right-2 bottom-14 z-[70] w-[340px] bg-os-panel border border-os-primary shadow-primary-glow rounded p-3" data-sound-group="panel">
            {activeQuickPanel === 'audio' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between"><h3 className="font-8bit text-[11px] text-os-primary">AUDIO MIXER</h3><button type="button" data-sound={isMuted ? 'toggleOn' : 'toggleOff'} onClick={() => setIsMuted((prev) => !prev)} className="px-2 py-1 text-xs border border-os-border hover:border-os-primary">{isMuted ? 'UNMUTE' : 'MUTE'}</button></div>
                <div><div className="flex justify-between text-xs text-os-dim mb-1"><span>MASTER</span><span>{outputVolume}%</span></div><input type="range" min={0} max={100} value={volume} onChange={(event) => { setVolume(Number(event.target.value)); if (isMuted) setIsMuted(false); }} className="w-full accent-os-primary" /></div>
                <div className="space-y-2">{Object.entries(appVolumes).map(([name, value]) => (<div key={name}><div className="flex justify-between text-[11px] text-os-dim"><span>{name.toUpperCase()}</span><span>{value}%</span></div><input type="range" min={0} max={100} value={value} onChange={(event) => setAppVolumes((prev) => ({ ...prev, [name]: Number(event.target.value) }))} className="w-full accent-os-primary" /></div>))}</div>
              </div>
            )}

            {activeQuickPanel === 'battery' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between"><h3 className="font-8bit text-[11px] text-os-primary">POWER & WEATHER</h3><span className={`text-xs font-bold ${batteryLevel <= 20 ? 'text-os-warning' : 'text-os-primary'}`}>{Math.round(batteryLevel)}%</span></div>
                <div className="w-full h-3 bg-os-bg border border-os-border rounded overflow-hidden"><div className={`${batteryLevel <= 20 ? 'bg-os-warning' : 'bg-os-primary'} h-full`} style={{ width: `${Math.max(3, batteryLevel)}%` }} /></div>
                <div className="text-xs text-os-dim">{batteryEstimate}</div>
                <div className="text-xs border border-os-border p-2 bg-os-bg"><div className="font-bold text-os-primary">{weather.text} | {weather.temp}°C</div><div className="text-os-dim">Humidity: {weather.humidity}%</div></div>
                <div className="flex items-center gap-2"><button type="button" data-sound={batteryCharging ? 'toggleOff' : 'toggleOn'} onClick={() => setBatteryCharging((prev) => !prev)} className="px-2 py-1 text-xs border border-os-border hover:border-os-primary">{batteryCharging ? 'DISCONNECT CHARGER' : 'CONNECT CHARGER'}</button><button type="button" data-sound={batterySaverAuto ? 'toggleOff' : 'toggleOn'} onClick={() => setBatterySaverAuto((prev) => !prev)} className={`px-2 py-1 text-xs border ${batterySaverAuto ? 'border-os-primary text-os-primary' : 'border-os-border hover:border-os-primary'}`}>AUTO SAVER {batterySaverAuto ? 'ON' : 'OFF'}</button></div>
                <div className="flex gap-2">{(['Balanced', 'Performance', 'Saver'] as const).map((mode) => (<button key={mode} type="button" data-sound="widget" onClick={() => setPowerMode(mode)} className={`px-2 py-1 text-[10px] border ${powerMode === mode ? 'border-os-primary text-os-primary bg-os-primarySoft' : 'border-os-border hover:border-os-primary'}`}>{mode.toUpperCase()}</button>))}</div>
              </div>
            )}

            {activeQuickPanel === 'notifications' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between"><h3 className="font-8bit text-[11px] text-os-primary">NOTIFICATIONS</h3><span className="text-xs text-os-dim">{unreadNotifications} unread</span></div>
                <div className="flex gap-2"><button type="button" data-sound={doNotDisturb ? 'toggleOff' : 'toggleOn'} onClick={() => setDoNotDisturb((prev) => !prev)} className={`px-2 py-1 text-xs border ${doNotDisturb ? 'border-os-primary text-os-primary bg-os-primarySoft' : 'border-os-border hover:border-os-primary'}`}>DO NOT DISTURB {doNotDisturb ? 'ON' : 'OFF'}</button><button type="button" data-sound="notify" onClick={() => addNotification('Manual Alert', 'Custom notification created.')} className="px-2 py-1 text-xs border border-os-border hover:border-os-primary">ADD TEST NOTIFICATION</button></div>
                <div className="max-h-56 overflow-auto space-y-2 pr-1">{notifications.map((item) => (<button type="button" key={item.id} onClick={() => setNotifications((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)))} className={`w-full text-left border p-2 rounded ${item.read ? 'border-os-border text-os-dim' : 'border-os-primary text-os-text bg-os-primarySoft'}`}><div className="flex justify-between items-start gap-2"><span className="text-xs font-bold">{item.title}</span><span className="text-[10px]">{item.time}</span></div><div className="text-xs mt-1">{item.detail}</div></button>))}</div>
                <div className="flex gap-2"><button type="button" onClick={() => setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))} className="flex-1 px-2 py-1 border border-os-border hover:border-os-primary text-xs">MARK ALL READ</button><button type="button" onClick={() => setNotifications([])} className="flex-1 px-2 py-1 border border-os-border hover:border-os-primary text-xs">CLEAR</button></div>
              </div>
            )}

            {activeQuickPanel === 'calendar' && (
              <div><h3 className="font-8bit text-[11px] text-os-primary mb-2">CALENDAR</h3><div className="text-xs text-os-dim mb-2">{time.toLocaleDateString(locale, { year: 'numeric', month: 'long' })}</div><div className="grid grid-cols-7 gap-1 text-[10px]">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((name, idx) => <div key={`${name}-${idx}`} className="text-center text-os-dim">{name}</div>)}{calendarDays.map((day, idx) => <div key={idx} className={`h-7 flex items-center justify-center border ${day === time.getDate() ? 'border-os-primary text-os-primary bg-os-primarySoft' : 'border-os-border text-os-text'}`}>{day ?? ''}</div>)}</div></div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isStartMenuOpen && (
          <motion.div ref={startMenuRef} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="absolute bottom-14 left-2 w-80 bg-os-panel border-2 border-os-primary shadow-primary-glow z-50 flex flex-col overflow-hidden rounded-t-lg">
            <div className="bg-os-primary p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-8bit text-os-bg text-lg">{activeProfile.name}</div>
                <div className="text-os-bg/80 text-xs">Signed In Profile</div>
              </div>
              <div className="px-2 py-1 border border-os-bg/40 text-[10px] font-bold text-os-bg tracking-wide">{activeProfile.permission}</div>
            </div>
            <div className="flex-1 p-2 bg-os-bg space-y-1">{apps.slice(0, 8).map((app) => (<button key={app.name} onClick={() => { app.launch(); setIsStartMenuOpen(false); }} className="w-full flex items-center gap-3 p-2 hover:bg-os-card rounded text-left group">{React.cloneElement(app.icon as React.ReactElement, { size: 16, className: 'text-os-primary' })}<span className="text-sm">{app.name}</span></button>))}</div>
            <div className="bg-os-card p-2 border-t border-os-divider flex justify-between items-center">
              <div className="flex gap-2"><button type="button" onClick={() => { setIsLocked(true); setIsStartMenuOpen(false); }} className="p-2 hover:bg-os-panel rounded text-os-dim hover:text-os-primary" title="Lock"><Lock size={16} /></button><button type="button" onClick={() => { launchByName('Settings'); setIsStartMenuOpen(false); }} className="p-2 hover:bg-os-panel rounded text-os-dim hover:text-os-primary" title="Settings"><Settings size={16} /></button></div>
              <button type="button" onClick={requestShutdown} data-sound="shutdown" className="flex items-center gap-2 px-3 py-1.5 bg-os-error/10 text-os-error hover:bg-os-error hover:text-white rounded transition-colors text-sm font-bold">SHUTDOWN</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute right-3 top-3 z-40 bg-os-panel/90 border border-os-border rounded p-1 flex items-center gap-1 backdrop-blur-sm">
        {[1, 2, 3].map((workspace) => (
          <button
            key={workspace}
            type="button"
            onClick={() => switchWorkspace(workspace)}
            data-sound="workspace"
            className={`px-2 py-1 text-[10px] border rounded ${currentWorkspace === workspace ? 'border-os-primary text-os-primary bg-os-primarySoft' : 'border-os-border text-os-dim hover:border-os-primary'}`}
          >
            {WORKSPACE_NAMES[workspace]}
          </button>
        ))}
      </div>

      <div className="absolute right-3 top-14 z-30 w-[330px] max-w-[46vw] grid grid-cols-2 gap-2" data-sound-group="panel">
        <div className="col-span-2 border border-os-border bg-os-panel/90 backdrop-blur-sm rounded px-3 py-2 shadow-panel-shadow">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-os-primary font-bold">Taskbar Characters</span>
            <button
              type="button"
              onClick={toggleCharacters}
              data-sound={charactersEnabled ? 'toggleOff' : 'toggleOn'}
              className={`px-2 py-0.5 border text-[10px] rounded ${charactersEnabled ? 'border-os-primary text-os-primary' : 'border-os-border text-os-dim hover:border-os-primary'}`}
            >
              {charactersEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="text-[10px] text-os-dim mt-1">Score {characterScore} | Tap runners and catch the spark for bonus points.</div>
        </div>

        <div className="border border-os-border bg-os-panel/90 backdrop-blur-sm rounded px-3 py-2 shadow-panel-shadow">
          <div className="text-[10px] text-os-dim">Focus Reactor</div>
          <div className="w-full h-2 border border-os-border bg-os-bg rounded mt-1 overflow-hidden">
            <div className={`${focusCharge < 20 ? 'bg-os-warning' : 'bg-os-primary'} h-full`} style={{ width: `${focusCharge}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-os-primary font-bold">{Math.round(focusCharge)}%</span>
            <button type="button" onClick={boostFocus} data-sound="success" className="px-2 py-1 text-[10px] border border-os-border hover:border-os-primary rounded">BOOST</button>
          </div>
        </div>

        <div className="border border-os-border bg-os-panel/90 backdrop-blur-sm rounded px-3 py-2 shadow-panel-shadow">
          <div className="text-[10px] text-os-dim">Neon Dice</div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[18px] text-os-primary font-bold leading-none">D{diceRoll}</span>
            <button type="button" onClick={rollDesktopDice} data-sound="widget" className="px-2 py-1 text-[10px] border border-os-border hover:border-os-primary rounded">ROLL</button>
          </div>
        </div>

        <div className="col-span-2 border border-os-border bg-os-panel/90 backdrop-blur-sm rounded px-3 py-2 shadow-panel-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-os-dim">Stopwatch Widget</span>
            <span className="text-[12px] text-os-primary font-bold tracking-wide">{stopwatchLabel}</span>
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={toggleStopwatch} data-sound={stopwatchRunning ? 'toggleOff' : 'toggleOn'} className="px-2 py-1 text-[10px] border border-os-border hover:border-os-primary rounded">{stopwatchRunning ? 'PAUSE' : 'START'}</button>
            <button type="button" onClick={resetStopwatch} data-sound="panel" className="px-2 py-1 text-[10px] border border-os-border hover:border-os-primary rounded">RESET</button>
            <button type="button" onClick={toggleSoundEffects} data-sound={soundEffectsEnabled ? 'toggleOff' : 'toggleOn'} className={`ml-auto px-2 py-1 text-[10px] border rounded ${soundEffectsEnabled ? 'border-os-primary text-os-primary' : 'border-os-border text-os-dim hover:border-os-primary'}`}>
              SOUND {soundEffectsEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {charactersEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-12 left-2 right-2 h-10 z-[49] pointer-events-none"
          >
            <div className="relative h-full border border-os-border bg-os-panel/85 backdrop-blur-sm rounded overflow-hidden pointer-events-auto">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(var(--os-primary-rgb)/0.08)_1px,transparent_1px)] bg-[size:16px_100%]" />
              <div className="absolute left-2 top-1 text-[9px] text-os-dim">TASKBAR RUNNERS</div>
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-os-primary shadow-primary-glow animate-pulse"
                style={{ left: `calc(${sparkX}% - 5px)` }}
              />
              {characters.map((character) => (
                <button
                  type="button"
                  key={character.id}
                  onClick={() => interactCharacter(character.id)}
                  data-sound="characterJump"
                  title={`${character.name} | click to jump`}
                  className="absolute bottom-0.5 w-9 h-7 border border-os-border bg-os-bg text-os-primary text-[10px] font-bold rounded transition-transform hover:border-os-primary"
                  style={{
                    left: `calc(${character.x}% - 18px)`,
                    transform: `translateY(${Date.now() < character.jumpUntil ? '-8px' : '0px'})`,
                  }}
                >
                  {character.glyph}
                </button>
              ))}
              <div className="absolute right-2 top-1 text-[10px] text-os-primary font-bold">Score {characterScore}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {goofyOverlay && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-16 z-[71] pointer-events-none"
          >
              <div className="px-4 py-2 border border-os-primary bg-os-panel text-os-primary text-xs font-bold shadow-primary-glow rounded">
              GOOFY MODE LIVE | HONK HONK
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="absolute bottom-0 left-0 right-0 h-12 bg-os-panel border-t border-os-border flex items-center justify-between px-2 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]"
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setTaskbarContextMenu(getMenuPosition(event.clientX, event.clientY, { width: 214, height: 290, preferAbove: true }));
          setContextMenu({ x: 0, y: 0, visible: false });
        }}
      >
        <div className="flex items-center gap-2 h-full py-1.5 min-w-0 flex-1">
          <button data-sound="panel" className={`h-full px-4 flex items-center gap-2 font-8bit text-xs rounded border ${isStartMenuOpen ? 'bg-os-primaryActive border-os-primaryActive text-os-bg' : 'bg-os-primary border-os-primary text-os-bg hover:bg-os-primaryHover'}`} onClick={() => { setIsStartMenuOpen(!isStartMenuOpen); setActiveQuickPanel(null); }}>START</button>
          <div className="w-px h-full bg-os-divider mx-1" />
          <div className="flex items-center gap-1 h-full overflow-x-auto no-scrollbar pr-1">
            {windows.filter((windowItem) => windowItem.workspace === currentWorkspace).map((windowItem) => (
              <button
                key={windowItem.id}
                onClick={() => focusWindow(windowItem.id)}
                className={`h-8 min-w-[150px] max-w-[320px] px-3 flex items-center justify-center font-8bit text-[10px] leading-none rounded border overflow-hidden ${windowItem.isActive ? 'bg-os-card text-os-primary border-os-primary' : 'bg-os-bg text-os-text border-os-border hover:border-os-primary'} ${windowItem.isMinimized ? 'opacity-70' : ''} transition-all`}
              >
                <span className="truncate">{windowItem.title} {windowItem.isMinimized ? '(Minimized)' : ''}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 h-full px-2 shrink-0">
          <div className="text-[10px] text-os-dim text-right leading-tight"><div>Uptime {Math.floor(uptimeSeconds / 60)}m {uptimeSeconds % 60}s</div><div>Processes {processStat} | Frame Rate {fpsCap}</div></div>
          <div ref={quickButtonsRef} className="flex items-center gap-3 text-os-dim mr-1">
            <button type="button" data-sound="panel" onClick={() => setActiveQuickPanel((p) => (p === 'audio' ? null : 'audio'))} className={`${activeQuickPanel === 'audio' ? 'text-os-primary' : 'hover:text-os-primary'}`} title="Audio">{outputVolume === 0 ? <VolumeX size={16} className="cursor-pointer" /> : <Volume2 size={16} className="cursor-pointer" />}</button>
            <button type="button" data-sound="panel" onClick={() => setActiveQuickPanel((p) => (p === 'battery' ? null : 'battery'))} className={`${activeQuickPanel === 'battery' ? 'text-os-primary' : 'hover:text-os-primary'}`} title={`Battery ${Math.round(batteryLevel)}%`}><Battery size={16} className="cursor-pointer" /></button>
            <button type="button" data-sound="panel" onClick={() => setActiveQuickPanel((p) => (p === 'notifications' ? null : 'notifications'))} className={`relative ${activeQuickPanel === 'notifications' ? 'text-os-primary' : 'hover:text-os-primary'}`} title="Notifications"><Bell size={16} className="cursor-pointer" />{unreadNotifications > 0 && (<span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-os-warning text-os-bg text-[9px] leading-[14px] text-center px-0.5">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>)}</button>
          </div>

          <div className="w-px h-full bg-os-divider py-2" />
          <button
            type="button"
            onClick={handleBrandClick}
            data-sound="widget"
            className="font-8bit text-[12px] text-os-primary text-shadow-glow h-full flex items-center px-1 hover:text-os-warning"
            title="Tap 3 times quickly"
          >
            <GlitchText text="Y7XIFIED" className="font-bold" />
          </button>
          <button
            type="button"
            onClick={() => setActiveQuickPanel((p) => (p === 'calendar' ? null : 'calendar'))}
            data-sound="widget"
            className="text-[11px] text-os-primary font-bold bg-os-bg px-3 py-1.5 rounded border border-os-border shadow-inner flex flex-col items-center justify-center leading-none min-w-[120px]"
            title="Date and Time"
          >
            <span className="text-[15px] tracking-wide">{time.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="text-[10px] text-os-dim tracking-wide">{time.toLocaleDateString(locale)}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {taskbarContextMenu.visible && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="absolute z-[86] w-[214px] bg-os-panel border border-os-primary rounded shadow-primary-glow p-1.5" style={{ left: taskbarContextMenu.x, top: taskbarContextMenu.y }}>
            <div className="space-y-1.5">
              <button type="button" data-sound="open" onClick={() => { launchByName('Monitor'); setTaskbarContextMenu({ x: 0, y: 0, visible: false }); }} className="w-full text-left px-3 py-2 text-xs hover:bg-os-card">Open Task Manager</button>
              <button type="button" data-sound="open" onClick={() => { launchByName('Settings'); setTaskbarContextMenu({ x: 0, y: 0, visible: false }); }} className="w-full text-left px-3 py-2 text-xs hover:bg-os-card">Open Settings</button>
              <button type="button" data-sound="minimize" onClick={() => { showDesktop(); setTaskbarContextMenu({ x: 0, y: 0, visible: false }); }} className="w-full text-left px-3 py-2 text-xs hover:bg-os-card">Minimize Current Workspace</button>
              <button type="button" data-sound={doNotDisturb ? 'toggleOff' : 'toggleOn'} onClick={() => { setDoNotDisturb((prev) => !prev); setTaskbarContextMenu({ x: 0, y: 0, visible: false }); showStatus(`Do Not Disturb ${!doNotDisturb ? 'enabled' : 'disabled'}`); }} className="w-full text-left px-3 py-2 text-xs hover:bg-os-card">{doNotDisturb ? 'Disable Do Not Disturb' : 'Enable Do Not Disturb'}</button>
              <button type="button" data-sound={charactersEnabled ? 'toggleOff' : 'toggleOn'} onClick={() => { toggleCharacters(); setTaskbarContextMenu({ x: 0, y: 0, visible: false }); }} className="w-full text-left px-3 py-2 text-xs hover:bg-os-card">{charactersEnabled ? 'Disable Taskbar Characters' : 'Enable Taskbar Characters'}</button>
              <button type="button" data-sound={soundEffectsEnabled ? 'toggleOff' : 'toggleOn'} onClick={() => { toggleSoundEffects(); setTaskbarContextMenu({ x: 0, y: 0, visible: false }); }} className="w-full text-left px-3 py-2 text-xs hover:bg-os-card">{soundEffectsEnabled ? 'Disable Sound Effects' : 'Enable Sound Effects'}</button>
              <button type="button" data-sound="panel" onClick={() => { setIsLocked(true); setTaskbarContextMenu({ x: 0, y: 0, visible: false }); }} className="w-full text-left px-3 py-2 text-xs hover:bg-os-card">Lock Session</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

