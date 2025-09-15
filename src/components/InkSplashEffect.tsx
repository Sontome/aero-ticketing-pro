import React, { useEffect, useState } from 'react';

interface InkSplashEffectProps {
  isActive: boolean;
  x: number;
  y: number;
  onComplete: () => void;
}

export const InkSplashEffect = ({ isActive, x, y, onComplete }: InkSplashEffectProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isActive) {
      setMounted(true);
      const timer = setTimeout(() => {
        onComplete();
        setMounted(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  if (!isActive && !mounted) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      style={{ background: 'transparent' }}
    >
      <div
        className={`absolute rounded-full bg-primary transition-all duration-1000 ease-out ${
          isActive ? 'ink-splash-active' : ''
        }`}
        style={{
          left: x - 10,
          top: y - 10,
          width: '20px',
          height: '20px',
          transform: isActive ? 'scale(100)' : 'scale(0)',
          opacity: isActive ? 0 : 1,
        }}
      />
    </div>
  );
};