import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export const CustomCursor: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [trails, setTrails] = useState<{ x: number; y: number; id: number }[]>([]);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      
      // Add trail
      setTrails(prev => {
        const newTrails = [...prev, { x: e.clientX, y: e.clientY, id: Date.now() }];
        if (newTrails.length > 10) newTrails.shift();
        return newTrails;
      });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'button' || 
          target.tagName.toLowerCase() === 'a' || 
          target.closest('button') || 
          target.closest('a') ||
          window.getComputedStyle(target).cursor === 'pointer') {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Cleanup trails
    const trailInterval = setInterval(() => {
      setTrails(prev => prev.slice(1));
    }, 50);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      clearInterval(trailInterval);
    };
  }, []);

  return (
    <>
      {/* Trails */}
      {trails.map((trail, index) => (
        <motion.div
          key={trail.id}
          className="fixed top-0 left-0 w-2 h-2 bg-os-primary rounded-full pointer-events-none z-[9998] mix-blend-screen"
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            x: trail.x - 4,
            y: trail.y - 4,
          }}
        />
      ))}

      {/* Main Cursor */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] flex items-center justify-center mix-blend-screen"
        animate={{
          x: mousePosition.x - (isHovering ? 16 : 8),
          y: mousePosition.y - (isHovering ? 16 : 8),
          scale: isClicking ? 0.8 : 1,
        }}
        transition={{ type: 'tween', ease: 'backOut', duration: 0.1 }}
      >
        <div 
          className={`border-2 border-os-primary transition-all duration-200 ${
            isHovering ? 'w-8 h-8 rounded-full bg-os-primarySoft' : 'w-4 h-4 rounded-sm bg-os-primary'
          }`}
          style={{
            boxShadow: isHovering
              ? '0 0 15px rgb(var(--os-primary-rgb) / 0.5)'
              : '0 0 10px rgb(var(--os-primary-rgb) / 0.8)',
          }}
        />
        {isHovering && (
          <div className="absolute w-1 h-1 bg-os-primary rounded-full" />
        )}
      </motion.div>
    </>
  );
};
