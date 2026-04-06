import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../../store/player-store.js';
import { formatCurrency, formatMultiplier } from '../../lib/format.js';

export function CashoutCelebration() {
  const { cashedOutAt, betAmount } = usePlayerStore(
    useShallow((s) => ({
      cashedOutAt: s.cashedOutAt,
      betAmount: s.betAmount,
    }))
  );

  const [celebration, setCelebration] = useState<{
    amount: number;
    multiplier: number;
    id: number;
  } | null>(null);

  useEffect(() => {
    if (cashedOutAt != null) {
      setCelebration({
        amount: cashedOutAt * betAmount,
        multiplier: cashedOutAt,
        id: Date.now(),
      });
      
      const timer = setTimeout(() => {
        setCelebration(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [cashedOutAt, betAmount]);

  if (!celebration) return null;

  return (
    <div
      key={celebration.id}
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20"
    >
      <div className="animate-[slide-up-fade_2s_ease-out_forwards] flex flex-col items-center">
        <span className="text-emerald-400 text-6xl font-black drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]">
          +{formatCurrency(celebration.amount)}
        </span>
        <span className="text-emerald-200 text-2xl font-bold mt-2 bg-emerald-900/50 px-4 py-1 rounded-full">
          Cashed out @ {formatMultiplier(celebration.multiplier)}
        </span>
      </div>
      <style>{`
        @keyframes slide-up-fade {
          0% { opacity: 0; transform: translateY(50px) scale(0.5); }
          20% { opacity: 1; transform: translateY(0) scale(1.1); }
          30% { transform: scale(1); }
          80% { opacity: 1; transform: translateY(-20px); }
          100% { opacity: 0; transform: translateY(-50px); }
        }
      `}</style>
    </div>
  );
}