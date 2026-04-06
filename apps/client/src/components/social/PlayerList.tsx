import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/game-store.js';
import { usePlayerStore } from '../../store/player-store.js';
import { formatCurrency, formatMultiplier } from '../../lib/format.js';

export function PlayerList() {
  const bots = useGameStore((s) => s.bots);
  const { hasActiveBet, betAmount, cashedOutAt } = usePlayerStore(
    useShallow((s) => ({
      hasActiveBet: s.hasActiveBet,
      betAmount: s.betAmount,
      cashedOutAt: s.cashedOutAt,
    }))
  );

  const hasBots = bots.length > 0;
  const hasPlayer = hasActiveBet || cashedOutAt != null;

  if (!hasBots && !hasPlayer) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex-1 min-h-0 overflow-hidden">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Players
        </h3>
        <p className="text-gray-600 text-sm text-center py-4">
          No active players
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex-1 min-h-0 flex flex-col">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 shrink-0">
        Players ({bots.length + (hasPlayer ? 1 : 0)})
      </h3>
      <div className="overflow-y-auto flex flex-col gap-1 min-h-0">
        {/* Local player row */}
        {hasPlayer && (
          <div
            className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors ${
              cashedOutAt != null
                ? 'bg-emerald-900/40 text-emerald-300'
                : 'bg-gray-800 text-white'
            }`}
          >
            <span className="font-medium truncate">You</span>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-gray-400 font-mono text-xs">
                {formatCurrency(betAmount)}
              </span>
              {cashedOutAt != null && (
                <span className="text-emerald-400 font-bold text-xs">
                  {formatMultiplier(cashedOutAt)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bot rows */}
        {bots.map((bot) => (
          <div
            key={bot.id}
            className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors ${
              bot.cashedOutAt != null
                ? 'bg-emerald-900/40 text-emerald-300'
                : 'bg-gray-800 text-gray-300'
            }`}
          >
            <span className="font-medium truncate">{bot.name}</span>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-gray-400 font-mono text-xs">
                {formatCurrency(bot.betAmount)}
              </span>
              {bot.cashedOutAt != null && (
                <span className="text-emerald-400 font-bold text-xs">
                  {formatMultiplier(bot.cashedOutAt)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
