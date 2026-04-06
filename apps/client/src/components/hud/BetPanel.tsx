import { useState } from 'react';
import { usePlayerStore } from '../../store/player-store.js';
import { formatCurrency } from '../../lib/format.js';
import { CashoutButton } from './CashoutButton.js';

interface BetPanelProps {
  onPlaceBet: (amount: number, autoCashout: number | undefined) => void;
  onCashOut: () => void;
}

export function BetPanel({ onPlaceBet, onCashOut }: BetPanelProps) {
  const { balance, betAmount, autoCashoutAt, setBetAmount, setAutoCashout } =
    usePlayerStore();

  const [autoCashoutInput, setAutoCashoutInput] = useState(
    autoCashoutAt != null ? String(autoCashoutAt) : '',
  );

  function handlePlaceBet() {
    const parsedAuto = parseFloat(autoCashoutInput);
    const autoCashout =
      !isNaN(parsedAuto) && parsedAuto >= 1.01 ? parsedAuto : undefined;
    onPlaceBet(betAmount, autoCashout);
  }

  function handleBetInput(value: string) {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) {
      setBetAmount(parsed);
    }
  }

  function handleAutoCashoutInput(value: string) {
    setAutoCashoutInput(value);
    const parsed = parseFloat(value);
    setAutoCashout(!isNaN(parsed) && parsed >= 1.01 ? parsed : null);
  }

  return (
    <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-3 border border-gray-800">
      {/* Balance */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Balance</span>
        <span className="text-cyan-400 font-mono font-semibold text-base">
          {formatCurrency(balance)}
        </span>
      </div>

      {/* Bet amount */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Bet Amount</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={betAmount}
          onChange={(e) => handleBetInput(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500 transition-colors"
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setBetAmount(Math.max(0.01, betAmount / 2))}
            className="flex-1 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium"
          >
            ½
          </button>
          <button
            onClick={() => setBetAmount(betAmount * 2)}
            className="flex-1 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium"
          >
            2×
          </button>
          <button
            onClick={() => setBetAmount(balance)}
            className="flex-1 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium"
          >
            Max
          </button>
        </div>
      </div>

      {/* Auto cashout */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">
          Auto Cash Out (optional)
        </label>
        <input
          type="number"
          min="1.01"
          step="0.01"
          placeholder="e.g. 2.00"
          value={autoCashoutInput}
          onChange={(e) => handleAutoCashoutInput(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {/* Action button */}
      <CashoutButton onPlaceBet={handlePlaceBet} onCashOut={onCashOut} />
    </div>
  );
}
