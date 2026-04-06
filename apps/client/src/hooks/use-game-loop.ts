import { useEffect, useRef } from 'react';
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../store/game-store.js';

const GROWTH_RATE = 0.00006;

function interpolateMultiplier(elapsedMs: number): number {
  return Math.exp(elapsedMs * GROWTH_RATE);
}

export function useGameLoop() {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    function tick() {
      const { phase, roundStartedAt, setMultiplier } = useGameStore.getState();

      if (phase === GamePhase.FLYING && roundStartedAt !== null) {
        const elapsed = Date.now() - roundStartedAt;
        const multiplier = interpolateMultiplier(elapsed);
        setMultiplier(multiplier);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);
}
