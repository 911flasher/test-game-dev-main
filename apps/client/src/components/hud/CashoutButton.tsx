import { GamePhase } from '@crash/shared';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/game-store.js';
import { usePlayerStore } from '../../store/player-store.js';
import { formatMultiplier, formatCurrency } from '../../lib/format.js';

interface CashoutButtonProps {
  onPlaceBet: () => void;
  onCashOut: () => void;
}

export function CashoutButton({ onPlaceBet, onCashOut }: CashoutButtonProps) {
  const phase = useGameStore((s) => s.phase);
  const multiplier = useGameStore((s) => s.multiplier);
  const { hasActiveBet, cashedOutAt, betAmount } = usePlayerStore(
    useShallow((s) => ({
      hasActiveBet: s.hasActiveBet,
      cashedOutAt: s.cashedOutAt,
      betAmount: s.betAmount,
    }))
  );

  if (phase === GamePhase.WAITING || phase === GamePhase.COUNTDOWN) {
    return (
      <button
        onClick={onPlaceBet}
        disabled={hasActiveBet}
        className="w-full py-4 rounded-xl text-lg font-bold tracking-wide bg-cyan-500 hover:bg-cyan-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 transition-all"
      >
        {hasActiveBet ? 'Bet Placed' : 'PLACE BET'}
      </button>
    );
  }

  if (phase === GamePhase.FLYING && hasActiveBet) {
    return (
      <button
        onClick={onCashOut}
        className="w-full py-4 rounded-xl text-lg font-bold tracking-wide bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white transition-all animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]"
      >
        CASH OUT @ {formatMultiplier(multiplier)}
      </button>
    );
  }

  if (phase === GamePhase.CRASHED) {
    if (cashedOutAt != null) {
      const winnings = betAmount * cashedOutAt;
      return (
        <button
          disabled
          className="w-full py-4 rounded-xl text-lg font-bold tracking-wide bg-emerald-800 text-emerald-300 cursor-default"
        >
          Won {formatCurrency(winnings)} @ {formatMultiplier(cashedOutAt)}
        </button>
      );
    }
    if (hasActiveBet) {
      return (
        <button
          disabled
          className="w-full py-4 rounded-xl text-lg font-bold tracking-wide bg-red-900 text-red-300 cursor-default"
        >
          BUSTED
        </button>
      );
    }
  }

  // Default: waiting for next round
  return (
    <button
      disabled
      className="w-full py-4 rounded-xl text-lg font-bold tracking-wide bg-gray-800 text-gray-500 cursor-default"
    >
      Waiting...
    </button>
  );
}
