import React, { useEffect, useState } from 'react';

interface InkSplashEffectProps {
  isActive: boolean;
  x: number;
  y: number;
  onComplete: () => void;
}

export const InkSplashEffect = ({ isActive, x, y, onComplete }: InkSplashEffectProps) => {
  const [mounted, setMounted] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isActive) {
      setMounted(true);
      requestAnimationFrame(() => setAnimate(true));
      const timer = setTimeout(() => {
        onComplete();
        setMounted(false);
        setAnimate(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  if ( !mounted) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      
    >
      <div
        className={`absolute rounded-full 
        bg-black 
        transition-transform duration-1000 ease-out
        `}
        style={{
          left: x,
          top: y,
          width: '20px',
          height: '20px',
          transform: animate 
            ? 'translate(-50%, -50%) scale(100)'  // bung to hết màn
            : 'translate(-50%, -50%) scale(0)',
        }}
      />
    </div>
  );
};
