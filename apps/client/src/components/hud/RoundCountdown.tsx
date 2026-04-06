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
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-10">
        <span className="text-gray-300 text-3xl font-bold uppercase tracking-[0.2em] mb-2 animate-pulse">
          Place your bets
        </span>
        <span className="text-cyan-400 text-sm font-mono opacity-70">
          Waiting for next round...
        </span>
      </div>
    );
  }

  if (phase === GamePhase.COUNTDOWN) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
        {/* We use key={count} to force React to remount the span on every tick, re-triggering the animation */}
        <span
          key={count}
          className="text-cyan-400 text-9xl font-black drop-shadow-[0_0_30px_rgba(34,211,238,0.8)] animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite]"
          style={{ animationIterationCount: 1 }}
        >
          {count > 0 ? count : 'GO!'}
        </span>
      </div>
    );
  }

  return null;
}
