import { useCallback, useRef } from 'react';

export const useHoverSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef<number>(0);

  const playClickSound = useCallback(() => {
    // Debounce to prevent rapid repeated sounds
    const now = Date.now();
    if (now - lastPlayedRef.current < 100) return;
    lastPlayedRef.current = now;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/hover-click.mp3');
        audioRef.current.volume = 0.3;
      }
      
      // Reset and play
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Silently fail if autoplay blocked
      });
    } catch (e) {
      // Silently fail if audio not supported
    }
  }, []);

  return { playClickSound };
};
