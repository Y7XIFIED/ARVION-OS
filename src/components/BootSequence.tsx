import React, { useState, useEffect, useRef } from 'react';
import { EncryptionText } from './EncryptionText';
import { GlitchText } from './GlitchText';
import { motion } from 'framer-motion';

interface BootSequenceProps {
  onComplete: () => void;
}

const bootLogs = [
  "INITIALIZING ARVION KERNEL v1.0.0...",
  "LOADING MODULES...",
  "MOUNTING VIRTUAL FILESYSTEM...",
  "CHECKING MEMORY... OK",
  "ESTABLISHING SECURE CONNECTION...",
  "DECRYPTING CORE ASSETS...",
  "BYPASSING FIREWALL...",
  "ACCESS GRANTED."
];

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [showLogo, setShowLogo] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const ensureAudioContext = () => {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
    return audioContextRef.current;
  };

  const playBootTone = (
    context: AudioContext,
    step: { start: number; end: number; duration: number; delay: number; type?: OscillatorType; gain?: number }
  ) => {
    const when = context.currentTime + step.delay;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = step.type ?? 'triangle';
    osc.frequency.setValueAtTime(step.start, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, step.end), when + step.duration);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(step.gain ?? 0.03, when + Math.min(0.03, step.duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, when + step.duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(when);
    osc.stop(when + step.duration + 0.02);
  };

  useEffect(() => {
    if (currentLogIndex < bootLogs.length) {
      const timer = setTimeout(() => {
        setCurrentLogIndex(prev => prev + 1);
      }, 300 + Math.random() * 300);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setShowLogo(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentLogIndex]);

  useEffect(() => {
    if (localStorage.getItem('arvion_sound_enabled') === '0') return;
    const context = ensureAudioContext();
    if (!context) return;
    if (context.state === 'suspended') context.resume().catch(() => undefined);
    [
      { start: 180, end: 250, duration: 0.09, delay: 0, type: 'sine' as OscillatorType, gain: 0.028 },
      { start: 250, end: 340, duration: 0.1, delay: 0.08, type: 'triangle' as OscillatorType, gain: 0.032 },
      { start: 340, end: 460, duration: 0.12, delay: 0.17, type: 'triangle' as OscillatorType, gain: 0.032 },
    ].forEach((step) => playBootTone(context, step));
  }, []);

  useEffect(() => {
    if (showLogo) {
      if (localStorage.getItem('arvion_sound_enabled') !== '0') {
        const context = ensureAudioContext();
        if (context) {
          if (context.state === 'suspended') context.resume().catch(() => undefined);
          [
            { start: 420, end: 620, duration: 0.1, delay: 0, type: 'sine' as OscillatorType, gain: 0.034 },
            { start: 620, end: 780, duration: 0.12, delay: 0.09, type: 'sine' as OscillatorType, gain: 0.03 },
          ].forEach((step) => playBootTone(context, step));
        }
      }
      const timer = setTimeout(() => {
        onComplete();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [showLogo, onComplete]);

  useEffect(() => () => {
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  }, []);

  return (
    <div className="w-full h-full flex flex-col p-8 text-os-text font-mono text-sm md:text-base overflow-hidden relative bg-os-bg">
      <div className="absolute inset-0 bg-radial-glow opacity-50 pointer-events-none"></div>
      
      <div className="flex-1 z-10 flex items-center justify-center">
        <div className="w-full max-w-3xl">
          {bootLogs.slice(0, currentLogIndex).map((log, i) => (
            <div key={i} className="mb-1 text-center">
              <span className="text-os-dim mr-2">[{new Date().toISOString().split('T')[1].slice(0, 8)}]</span>
              <EncryptionText text={log} speed={20} className="text-os-primary font-bold" />
            </div>
          ))}
          {currentLogIndex < bootLogs.length && (
            <div className="mb-1 animate-pulse text-os-primary text-center">_</div>
          )}
        </div>
      </div>

      {showLogo && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center flex-col bg-os-bg/90 backdrop-blur-sm z-20"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgb(var(--os-primary-rgb)/0.15)_0%,transparent_60%)]"></div>
          
          <div className="font-8bit text-4xl md:text-6xl text-os-primary mb-8 text-center leading-tight text-shadow-glow relative z-10">
            <GlitchText text="ARVION" />
          </div>
          <div className="font-mono text-base md:text-xl text-os-primary font-bold relative z-10 text-center px-4">
            <EncryptionText text="POWERED BY Y7X" speed={40} delay={500} />
          </div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.0 }}
            className="mt-12 text-os-dim animate-pulse font-bold relative z-10"
          >
            ENTERING SYSTEM...
          </motion.div>
          
          {/* Decorative elements */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-os-primary/20 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 border border-os-primary/10 rounded-full animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
        </motion.div>
      )}
    </div>
  );
};

