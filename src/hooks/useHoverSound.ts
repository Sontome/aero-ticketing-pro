import { useCallback, useRef } from 'react';

export const useHoverSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef<number>(0);

  const playClickSound = useCallback(() => {
    // Debounce to prevent rapid repeated sounds
    const now = Date.now();
    if (now - lastPlayedRef.current < 100) return;
    lastPlayedRef.current = now;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      
      // Create a clearer "tick" sound with two oscillators
      const oscillator1 = ctx.createOscillator();
      const oscillator2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Higher frequency for sharper tick
      oscillator1.frequency.setValueAtTime(1200, ctx.currentTime);
      oscillator1.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.04);
      oscillator1.type = 'square';
      
      // Second oscillator for more body
      oscillator2.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator2.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
      oscillator2.type = 'triangle';
      
      // Louder and longer decay for clearer sound
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      
      oscillator1.start(ctx.currentTime);
      oscillator2.start(ctx.currentTime);
      oscillator1.stop(ctx.currentTime + 0.08);
      oscillator2.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // Silently fail if audio context not supported
    }
  }, []);

  return { playClickSound };
};
