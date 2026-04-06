import { GamePhase } from '@crash/shared';
import { useGameStore } from '../../store/game-store.js';
import { formatMultiplier } from '../../lib/format.js';

export function MultiplierDisplay() {
  const phase = useGameStore((s) => s.phase);
  const multiplier = useGameStore((s) => s.multiplier);
  const crashPoint = useGameStore((s) => s.crashPoint);

  if (phase === GamePhase.WAITING || phase === GamePhase.COUNTDOWN) {
    return null;
  }

  const isCrashed = phase === GamePhase.CRASHED;
  const displayValue = isCrashed && crashPoint != null ? crashPoint : multiplier;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
      {isCrashed && (
        <span className="text-red-400 text-xl font-bold tracking-widest uppercase mb-1 opacity-80">
          CRASHED
        </span>
      )}
      <span
        className={`font-black tabular-nums transition-colors ${
          isCrashed
            ? 'text-red-400 text-6xl'
            : 'text-cyan-400 text-7xl drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]'
        }`}
      >
        {formatMultiplier(displayValue)}
      </span>
    </div>
  );
}
