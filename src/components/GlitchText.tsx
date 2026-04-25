import React from 'react';
import { motion } from 'framer-motion';

interface GlitchTextProps {
  text: string;
  className?: string;
}

export const GlitchText: React.FC<GlitchTextProps> = ({ text, className = '' }) => {
  return (
    <div className={`relative inline-block ${className}`}>
      <motion.span
        className="absolute top-0 left-[2px] -ml-[2px] text-os-warning opacity-70 mix-blend-screen"
        animate={{
          clipPath: [
            'inset(20% 0 80% 0)',
            'inset(60% 0 10% 0)',
            'inset(10% 0 50% 0)',
            'inset(80% 0 5% 0)',
            'inset(30% 0 40% 0)',
          ],
          x: [-2, 2, -1, 1, -2],
        }}
        transition={{
          duration: 0.2,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      >
        {text}
      </motion.span>
      <motion.span
        className="absolute top-0 left-[-2px] -mr-[2px] text-os-primary opacity-70 mix-blend-screen"
        animate={{
          clipPath: [
            'inset(10% 0 60% 0)',
            'inset(80% 0 5% 0)',
            'inset(30% 0 40% 0)',
            'inset(20% 0 80% 0)',
            'inset(60% 0 10% 0)',
          ],
          x: [2, -2, 1, -1, 2],
        }}
        transition={{
          duration: 0.25,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      >
        {text}
      </motion.span>
      <span className="relative">{text}</span>
    </div>
  );
};
