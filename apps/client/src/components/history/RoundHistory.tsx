import { useGameStore } from '../../store/game-store.js';
import { formatMultiplier } from '../../lib/format.js';

function getBadgeColor(crashPoint: number): string {
  if (crashPoint >= 10) {
    return 'bg-yellow-500 text-yellow-950 font-black';
  }
  if (crashPoint >= 2) {
    return 'bg-emerald-700 text-emerald-100';
  }
  return 'bg-red-800 text-red-200';
}

export function RoundHistory() {
  const roundHistory = useGameStore((s) => s.roundHistory);

  if (roundHistory.length === 0) {
    return (
      <div className="h-10 bg-gray-900 border-b border-gray-800 flex items-center px-4">
        <span className="text-gray-600 text-xs">No rounds yet...</span>
      </div>
    );
  }

  return (
    <div className="h-10 bg-gray-900 border-b border-gray-800 flex items-center px-3 gap-1.5 overflow-x-auto scrollbar-none">
      {roundHistory.map((round) => (
        <span
          key={round.roundId}
          className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${getBadgeColor(round.crashPoint)}`}
          title={`Round ${round.roundId}`}
        >
          {formatMultiplier(round.crashPoint)}
        </span>
      ))}
    </div>
  );
}
