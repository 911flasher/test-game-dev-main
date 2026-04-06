import { GamePhase } from '@crash/shared';
import { useGameStore } from '../../store/game-store.js';
import { formatMultiplier } from '../../lib/format.js';

function getMultiplierStyles(multiplier: number, isCrashed: boolean) {
  if (isCrashed) {
    return {
      color: 'text-red-500',
      shadow: 'drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]',
      scale: 'scale-100',
      animation: 'animate-none',
    };
  }
  if (multiplier >= 10) {
    return {
      color: 'text-fuchsia-500',
      shadow: 'drop-shadow-[0_0_25px_rgba(217,70,239,0.8)]',
      scale: 'scale-110',
      animation: 'animate-pulse',
    };
  }
  if (multiplier >= 5) {
    return {
      color: 'text-amber-400',
      shadow: 'drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]',
      scale: 'scale-105',
      animation: 'animate-bounce',
    };
  }
  if (multiplier >= 2) {
    return {
      color: 'text-emerald-400',
      shadow: 'drop-shadow-[0_0_15px_rgba(52,211,153,0.7)]',
      scale: 'scale-100',
      animation: 'animate-none',
    };
  }
  return {
    color: 'text-cyan-400',
    shadow: 'drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]',
    scale: 'scale-100',
    animation: 'animate-none',
  };
}

export function MultiplierDisplay() {
  const phase = useGameStore((s) => s.phase);
  const multiplier = useGameStore((s) => s.multiplier);
  const crashPoint = useGameStore((s) => s.crashPoint);

  if (phase === GamePhase.WAITING || phase === GamePhase.COUNTDOWN) {
    return null;
  }

  const isCrashed = phase === GamePhase.CRASHED;
  const displayValue = isCrashed && crashPoint != null ? crashPoint : multiplier;
  const styles = getMultiplierStyles(displayValue, isCrashed);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-10">
      {isCrashed && (
        <span className="text-red-500 text-3xl font-black tracking-[0.2em] uppercase mb-2 opacity-90 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse">
          CRASHED @
        </span>
      )}
      <span
        className={`font-black tabular-nums transition-all duration-300 ease-out ${
          isCrashed ? 'text-7xl' : 'text-8xl'
        } ${styles.color} ${styles.shadow} ${styles.scale} ${styles.animation}`}
      >
        {formatMultiplier(displayValue)}
      </span>
    </div>
  );
}
