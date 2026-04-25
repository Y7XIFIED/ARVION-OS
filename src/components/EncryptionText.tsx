import React, { useState, useEffect } from 'react';

interface EncryptionTextProps {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+{}|:"<>?~`-=[]\\;\',./';

export const EncryptionText: React.FC<EncryptionTextProps> = ({
  text,
  delay = 0,
  speed = 50,
  className = '',
  onComplete
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStarted(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!isStarted) return;

    let iteration = 0;
    let interval: number;

    const animate = () => {
      setDisplayText(prev => {
        const nextText = text
          .split('')
          .map((char, index) => {
            if (index < iteration) {
              return text[index];
            }
            if (char === ' ') return ' ';
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('');

        if (iteration >= text.length) {
          clearInterval(interval);
          if (onComplete) onComplete();
          return text;
        }

        iteration += 1 / 3;
        return nextText;
      });
    };

    interval = window.setInterval(animate, speed);

    return () => clearInterval(interval);
  }, [text, isStarted, speed, onComplete]);

  return (
    <span className={className}>
      {isStarted ? displayText : ''}
    </span>
  );
};
