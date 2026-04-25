import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EncryptionText } from './EncryptionText';
import { GlitchText } from './GlitchText';

interface TerminalProps {
  onClose?: () => void;
}

const asciiArt = String.raw`$$\     $$\ $$$$$$$$\ $$\   $$\ $$$$$$\ $$$$$$$$\ $$$$$$\ $$$$$$$$\ $$$$$$$\  
\$$\   $$  |\____$$  |$$ |  $$ |\_$$  _|$$  _____|\_$$  _|$$  _____|$$  __$$\ 
 \$$\ $$  /     $$  / \$$\ $$  |  $$ |  $$ |        $$ |  $$ |      $$ |  $$ |
  \$$$$  /     $$  /   \$$$$  /   $$ |  $$$$$\      $$ |  $$$$$\    $$ |  $$ |
   \$$  /     $$  /    $$  $$<    $$ |  $$  __|     $$ |  $$  __|   $$ |  $$ |
    $$ |     $$  /    $$  /\$$\   $$ |  $$ |        $$ |  $$ |      $$ |  $$ |
    $$ |    $$  /     $$ /  $$ |$$$$$$\ $$ |      $$$$$$\ $$$$$$$$\ $$$$$$$  |
    \__|    \__/      \__|  \__|\______|\__|      \______|\________|\_______/ `;

type HistoryItem = { type: 'input' | 'output' | 'error' | 'ascii'; text: string };
type TerminalNavigator = Navigator & {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
};

type FastfetchModule = 'project' | 'time' | 'timezone' | 'uptime' | 'platform' | 'browser' | 'viewport' | 'cpu' | 'memory' | 'network';

const MODULE_ORDER: FastfetchModule[] = ['project', 'time', 'timezone', 'uptime', 'platform', 'browser', 'viewport', 'cpu', 'memory', 'network'];

const AVAILABLE_COMMANDS = [
  'help',
  'clear',
  'whoami',
  'date',
  'fastfetch',
  'neofetch',
  'ffmod list',
  'arv list',
  'arv install <pkg>',
  'alias list',
  'profile list',
  'split toggle',
  'theme accent',
  'font 14',
  'run help && fastfetch',
  'exit',
] as const;

const formatDuration = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
};

const DEFAULT_FFMODULES: Record<FastfetchModule, boolean> = {
  project: true,
  time: true,
  timezone: true,
  uptime: true,
  platform: true,
  browser: true,
  viewport: true,
  cpu: true,
  memory: true,
  network: true,
};

interface TerminalProfile {
  name: string;
  theme: 'accent' | 'matrix' | 'mono';
  fontSize: number;
  aliases: Record<string, string>;
}

export const Terminal: React.FC<TerminalProps> = ({ onClose }) => {
  const [history, setHistory] = useState<HistoryItem[]>([
    { type: 'ascii', text: asciiArt },
    { type: 'output', text: 'Arvion OS Terminal v2.0.0' },
    { type: 'output', text: 'Type "help" for commands.' },
  ]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState(-1);
  const [installedPackages, setInstalledPackages] = useState<string[]>(() => {
    const saved = localStorage.getItem('arvion_terminal_packages');
    return saved ? JSON.parse(saved) as string[] : ['core-utils', 'arcade-kit'];
  });
  const [aliases, setAliases] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('arvion_terminal_aliases');
    return saved ? JSON.parse(saved) as Record<string, string> : { ll: 'arv list', ff: 'fastfetch' };
  });
  const [profiles, setProfiles] = useState<TerminalProfile[]>(() => {
    const saved = localStorage.getItem('arvion_terminal_profiles');
    return saved ? JSON.parse(saved) as TerminalProfile[] : [];
  });
  const [splitPane, setSplitPane] = useState(false);
  const [theme, setTheme] = useState<'accent' | 'matrix' | 'mono'>(() => {
    const saved = localStorage.getItem('arvion_terminal_theme');
    return saved === 'matrix' || saved === 'mono' ? saved : 'accent';
  });
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('arvion_terminal_font');
    return saved ? Number(saved) : 13;
  });
  const [ffModules, setFfModules] = useState<Record<FastfetchModule, boolean>>(() => {
    const saved = localStorage.getItem('arvion_terminal_ffmodules');
    return saved ? JSON.parse(saved) as Record<FastfetchModule, boolean> : DEFAULT_FFMODULES;
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionStartRef = useRef<number>(performance.now());

  useEffect(() => {
    localStorage.setItem('arvion_terminal_packages', JSON.stringify(installedPackages));
  }, [installedPackages]);

  useEffect(() => {
    localStorage.setItem('arvion_terminal_aliases', JSON.stringify(aliases));
  }, [aliases]);

  useEffect(() => {
    localStorage.setItem('arvion_terminal_profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('arvion_terminal_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('arvion_terminal_font', String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('arvion_terminal_ffmodules', JSON.stringify(ffModules));
  }, [ffModules]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const suggestions = useMemo(() => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return AVAILABLE_COMMANDS.slice(0, 6);
    return AVAILABLE_COMMANDS.filter((command) => command.toLowerCase().includes(trimmed)).slice(0, 6);
  }, [input]);

  const pushOutputLines = (lines: string[]) => {
    setHistory((prev) => [...prev, ...lines.map((line) => ({ type: 'output' as const, text: line }))]);
  };

  const pushError = (text: string) => {
    setHistory((prev) => [...prev, { type: 'error', text }]);
  };

  const buildFastfetchLines = () => {
    const nav = navigator as TerminalNavigator;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const connection = nav.connection
      ? `${nav.connection.effectiveType ?? 'unknown'}${nav.connection.downlink ? ` ${nav.connection.downlink}Mb/s` : ''}${nav.connection.rtt ? ` ${nav.connection.rtt}ms` : ''}`
      : 'Unavailable';
    const memory = nav.deviceMemory ? `${nav.deviceMemory} GB` : 'Unknown';
    const cores = nav.hardwareConcurrency ?? 'Unknown';
    const browserName = navigator.userAgent.split(') ')[0].replace('Mozilla/5.0 (', '');
    const online = navigator.onLine ? 'ONLINE' : 'OFFLINE';
    const uptime = formatDuration(performance.now() - sessionStartRef.current);

    const modules: Record<FastfetchModule, string> = {
      project: 'Project    : ARVION by Y7XIFIED | POWERED BY Y7X',
      time: `Time       : ${new Date().toLocaleString()}`,
      timezone: `Timezone   : ${timezone}`,
      uptime: `Uptime     : ${uptime}`,
      platform: `Platform   : ${navigator.platform}`,
      browser: `Browser    : ${browserName}`,
      viewport: `Viewport   : ${window.innerWidth}x${window.innerHeight}`,
      cpu: `CPU Cores  : ${cores}`,
      memory: `Memory     : ${memory}`,
      network: `Network    : ${online} (${connection})`,
    };

    return [
      '==================== ARVION FASTFETCH ====================',
      ...MODULE_ORDER.filter((module) => ffModules[module]).map((module) => modules[module]),
      '==========================================================',
    ];
  };

  const applyAlias = (raw: string) => {
    const token = raw.trim().split(/\s+/)[0];
    if (!token || !aliases[token]) return raw;
    return `${aliases[token]} ${raw.trim().split(/\s+/).slice(1).join(' ')}`.trim();
  };

  const runScript = (script: string) => {
    const commands = script
      .split('&&')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 20);

    commands.forEach((line) => executeCommand(line, true));
  };

  const handleArv = (parts: string[]) => {
    const action = parts[1]?.toLowerCase();
    const pkg = parts[2];
    if (!action || action === 'help') {
      pushOutputLines([
        'arv package manager',
        '  arv list',
        '  arv install <package>',
        '  arv remove <package>',
      ]);
      return;
    }
    if (action === 'list') {
      pushOutputLines(installedPackages.length ? installedPackages.map((name) => `- ${name}`) : ['No packages installed.']);
      return;
    }
    if (action === 'install' && pkg) {
      if (installedPackages.includes(pkg)) {
        pushOutputLines([`${pkg} is already installed.`]);
      } else {
        setInstalledPackages((prev) => [...prev, pkg]);
        pushOutputLines([`Installing ${pkg}...`, `${pkg} installed successfully.`]);
      }
      return;
    }
    if (action === 'remove' && pkg) {
      setInstalledPackages((prev) => prev.filter((name) => name !== pkg));
      pushOutputLines([`${pkg} removed.`]);
      return;
    }
    pushError('Usage: arv [list|install|remove] <package>');
  };

  const handleAlias = (trimmedCmd: string) => {
    const rest = trimmedCmd.slice(5).trim();
    if (!rest || rest === 'list') {
      const lines = Object.entries(aliases).map(([name, command]) => `${name}="${command}"`);
      pushOutputLines(lines.length ? lines : ['No aliases configured.']);
      return;
    }
    if (rest.startsWith('del ')) {
      const name = rest.slice(4).trim();
      setAliases((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      pushOutputLines([`Alias ${name} removed.`]);
      return;
    }

    const parts = rest.split('=');
    if (parts.length < 2) {
      pushError('Usage: alias name=command  | alias del <name> | alias list');
      return;
    }
    const name = parts[0].trim();
    const command = parts.slice(1).join('=').trim();
    if (!name || !command) {
      pushError('Alias name and command cannot be empty.');
      return;
    }
    setAliases((prev) => ({ ...prev, [name]: command }));
    pushOutputLines([`Alias ${name}="${command}" saved.`]);
  };

  const handleProfile = (parts: string[]) => {
    const action = parts[1]?.toLowerCase();
    const name = parts[2];
    if (!action || action === 'list') {
      pushOutputLines(profiles.length ? profiles.map((profile) => `- ${profile.name} (theme=${profile.theme}, font=${profile.fontSize})`) : ['No saved profiles.']);
      return;
    }
    if (action === 'save' && name) {
      const profile: TerminalProfile = { name, theme, fontSize, aliases };
      setProfiles((prev) => {
        const without = prev.filter((item) => item.name !== name);
        return [...without, profile];
      });
      pushOutputLines([`Profile ${name} saved.`]);
      return;
    }
    if (action === 'load' && name) {
      const profile = profiles.find((item) => item.name === name);
      if (!profile) {
        pushError(`Profile not found: ${name}`);
        return;
      }
      setTheme(profile.theme);
      setFontSize(profile.fontSize);
      setAliases(profile.aliases);
      pushOutputLines([`Profile ${name} loaded.`]);
      return;
    }
    pushError('Usage: profile [list|save <name>|load <name>]');
  };

  const handleFastfetchModule = (parts: string[]) => {
    const action = parts[1]?.toLowerCase();
    const moduleName = parts[2] as FastfetchModule | undefined;
    if (!action || action === 'list') {
      pushOutputLines(MODULE_ORDER.map((module) => `${module}: ${ffModules[module] ? 'ON' : 'OFF'}`));
      return;
    }
    if ((action === 'on' || action === 'off' || action === 'toggle') && moduleName && MODULE_ORDER.includes(moduleName)) {
      setFfModules((prev) => ({
        ...prev,
        [moduleName]: action === 'toggle' ? !prev[moduleName] : action === 'on',
      }));
      pushOutputLines([`Module ${moduleName} -> ${action === 'toggle' ? 'TOGGLED' : action.toUpperCase()}`]);
      return;
    }
    pushError('Usage: ffmod [list|on|off|toggle] <module>');
  };

  const executeCommand = (rawCmd: string, fromScript = false) => {
    const resolved = applyAlias(rawCmd);
    const trimmedCmd = resolved.trim();
    if (!trimmedCmd) return;

    if (!fromScript) {
      setHistory((prev) => [...prev, { type: 'input', text: rawCmd.trim() }]);
      setCommandHistory((prev) => [...prev, rawCmd.trim()].slice(-80));
      setHistoryCursor(-1);
    }

    const parts = trimmedCmd.split(/\s+/);
    const command = parts[0].toLowerCase();

    switch (command) {
      case 'help':
        pushOutputLines([
          'Core:',
          '  help, clear, whoami, date, fastfetch, neofetch, decrypt, glitch, exit',
          'Terminal modules:',
          '  arv <list|install|remove> <package>      package manager',
          '  alias name=command | alias list | alias del <name>',
          '  profile list | profile save <name> | profile load <name>',
          '  split <on|off|toggle>                    split panes',
          '  theme <accent|matrix|mono>               terminal theme',
          '  font <size>                              font size',
          '  ffmod list | ffmod <on|off|toggle> <module>',
          '  run <cmd1 && cmd2 && ...>                script runner',
        ]);
        break;
      case 'clear':
        setHistory([{ type: 'ascii', text: asciiArt }]);
        break;
      case 'whoami':
        pushOutputLines(['guest@arvion']);
        break;
      case 'date':
        pushOutputLines([new Date().toString()]);
        break;
      case 'fastfetch':
      case 'neofetch':
        pushOutputLines(buildFastfetchLines());
        break;
      case 'arv':
        handleArv(parts);
        break;
      case 'alias':
        handleAlias(trimmedCmd);
        break;
      case 'profile':
        handleProfile(parts);
        break;
      case 'split': {
        const mode = parts[1]?.toLowerCase() ?? 'toggle';
        if (mode === 'toggle') setSplitPane((prev) => !prev);
        else if (mode === 'on') setSplitPane(true);
        else if (mode === 'off') setSplitPane(false);
        else pushError('Usage: split <on|off|toggle>');
        break;
      }
      case 'theme': {
        const next = parts[1]?.toLowerCase();
        if (next === 'accent' || next === 'matrix' || next === 'mono') {
          setTheme(next);
          pushOutputLines([`Theme set: ${next}`]);
        } else {
          pushError('Usage: theme <accent|matrix|mono>');
        }
        break;
      }
      case 'font': {
        const value = Number(parts[1]);
        if (Number.isFinite(value) && value >= 10 && value <= 24) {
          setFontSize(Math.round(value));
          pushOutputLines([`Font size set: ${Math.round(value)}px`]);
        } else {
          pushError('Usage: font <10-24>');
        }
        break;
      }
      case 'ffmod':
        handleFastfetchModule(parts);
        break;
      case 'run': {
        const script = trimmedCmd.slice(4).trim();
        if (!script) {
          pushError('Usage: run <cmd1 && cmd2>');
        } else {
          pushOutputLines(['Running script...']);
          runScript(script);
        }
        break;
      }
      case 'exit':
        onClose?.();
        break;
      case 'decrypt':
        pushOutputLines(['Initiating decryption sequence...']);
        window.setTimeout(() => {
          pushOutputLines(['DECRYPTING: [||||||||||] 100%', 'ACCESS GRANTED TO ARVION MAINFRAME.']);
        }, 900);
        break;
      case 'glitch':
        pushOutputLines(['SYSTEM COMPROMISED.']);
        break;
      default:
        pushError(`Command not found: ${command}`);
    }
  };

  const themeClass =
    theme === 'matrix'
      ? 'bg-[#060c06] text-[#bafab5]'
      : theme === 'mono'
        ? 'bg-[#0f0f10] text-[#d8d8dd]'
        : 'bg-black text-os-termText';

  const renderHistory = () => (
    <>
      {history.map((line, i) => (
        <div key={`${line.type}-${i}`} className={`mb-1 ${line.type === 'error' ? 'text-os-error' : ''}`}>
          {line.type === 'input' ? <span className="text-os-termPrompt mr-2">guest@arvion:~$</span> : null}
          {line.type === 'ascii' ? (
            <pre className="text-os-primary text-xs leading-tight mb-4">{line.text}</pre>
          ) : line.type === 'output' && i === history.length - 1 && line.text === 'SYSTEM COMPROMISED.' ? (
            <GlitchText text={line.text} className="text-os-error text-xl font-bold" />
          ) : line.type === 'output' && i === history.length - 1 && line.text.includes('DECRYPTING') ? (
            <EncryptionText text={line.text} speed={10} className="text-os-termResponse" />
          ) : (
            <span>{line.text}</span>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </>
  );

  return (
    <div className={`h-full w-full font-mono p-3 flex flex-col rounded-b-lg ${themeClass}`} style={{ fontSize: `${fontSize}px` }}>
      <div className={`flex-1 overflow-y-auto ${splitPane ? 'grid grid-cols-2 gap-2' : ''}`}>
        {splitPane ? (
          <>
            <div className="border border-os-border p-2 bg-black/30">{renderHistory()}</div>
            <div className="border border-os-border p-2 bg-black/30">{renderHistory()}</div>
          </>
        ) : (
          renderHistory()
        )}
      </div>

      <div className="flex items-center mt-2">
        <span className="text-os-termPrompt mr-2">guest@arvion:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              executeCommand(input);
              setInput('');
            } else if (e.key === 'Tab') {
              e.preventDefault();
              if (suggestions.length > 0) setInput(String(suggestions[0]));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHistoryCursor((prev) => {
                if (commandHistory.length === 0) return -1;
                const next = Math.min(prev + 1, commandHistory.length - 1);
                setInput(commandHistory[commandHistory.length - 1 - next]);
                return next;
              });
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHistoryCursor((prev) => {
                if (commandHistory.length === 0) return -1;
                const next = Math.max(prev - 1, -1);
                setInput(next === -1 ? '' : commandHistory[commandHistory.length - 1 - next]);
                return next;
              });
            }
          }}
          className="flex-1 bg-transparent border-none outline-none"
          placeholder="Type a command..."
          autoFocus
        />
        <span className="animate-pulse w-2 h-4 bg-current inline-block ml-1"></span>
      </div>

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-os-dim">Suggestions:</span>
        {suggestions.map((command) => (
          <button
            key={command}
            type="button"
            onClick={() => {
              setInput(String(command));
              inputRef.current?.focus();
            }}
            className="px-2 py-0.5 text-[10px] border border-os-border hover:border-os-primary hover:text-os-primary transition-colors"
          >
            {command}
          </button>
        ))}
      </div>
    </div>
  );
};
