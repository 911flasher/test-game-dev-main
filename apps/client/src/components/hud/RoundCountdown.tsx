import { useEffect, useState } from 'react';
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../../store/game-store.js';

export function RoundCountdown() {
  const phase = useGameStore((s) => s.phase);
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (phase !== GamePhase.COUNTDOWN) {
      setCount(3);
      return;
    }

    setCount(3);
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  if (phase === GamePhase.WAITING) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="text-gray-400 text-2xl font-semibold animate-pulse">
          Place your bets...
        </span>
      </div>
    );
  }

  if (phase === GamePhase.COUNTDOWN) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="text-cyan-400 text-8xl font-black animate-ping-once">
          {count > 0 ? count : 'GO!'}
        </span>
      </div>
    );
  }

  return null;
}
