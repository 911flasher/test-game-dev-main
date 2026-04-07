import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../../store/player-store.js';
import { formatCurrency } from '../../lib/format.js';
import { CashoutButton } from './CashoutButton.js';

interface BetPanelProps {
  onPlaceBet: (amount: number, autoCashout: number | undefined) => void;
  onCashOut: () => void;
}

export function BetPanel({ onPlaceBet, onCashOut }: BetPanelProps) {
  const {
    balance,
    betAmount,
    autoCashoutAt,
    autoBetEnabled,
    autoBetStrategy,
    autoBetMultiplier,
    setBetAmount,
    setAutoCashout,
    setAutoBetEnabled,
    setAutoBetStrategy,
    setAutoBetMultiplier,
  } =
    usePlayerStore(
      useShallow((s) => ({
        balance: s.balance,
        betAmount: s.betAmount,
        autoCashoutAt: s.autoCashoutAt,
        autoBetEnabled: s.autoBetEnabled,
        autoBetStrategy: s.autoBetStrategy,
        autoBetMultiplier: s.autoBetMultiplier,
        setBetAmount: s.setBetAmount,
        setAutoCashout: s.setAutoCashout,
        setAutoBetEnabled: s.setAutoBetEnabled,
        setAutoBetStrategy: s.setAutoBetStrategy,
        setAutoBetMultiplier: s.setAutoBetMultiplier,
      }))
    );

  const [autoCashoutInput, setAutoCashoutInput] = useState(
    autoCashoutAt != null ? String(autoCashoutAt) : '',
  );
  const [errorShake, setErrorShake] = useState(false);

  function triggerHaptic(type: 'success' | 'error') {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        if (type === 'error') {
          window.navigator.vibrate([50, 50, 50]);
        } else {
          window.navigator.vibrate(50);
        }
      } catch (e) {
        // Ignore haptic errors
      }
    }
  }

  function handlePlaceBet() {
    if (autoCashoutInput.trim() !== '') {
      const parsedAuto = parseFloat(autoCashoutInput);
      if (isNaN(parsedAuto) || parsedAuto < 1.01) {
        triggerHaptic('error');
        setErrorShake(true);
        setTimeout(() => setErrorShake(false), 400);
        return; // Prevent placing bet if auto-cashout is invalid
      }
    }

    triggerHaptic('success');
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
      <div className={`transition-transform ${errorShake ? 'animate-shake' : ''}`}>
        <label className="text-xs text-gray-400 mb-1 block">
          Auto Cash Out (optional)
        </label>
        <input
          type="number"
          min="1.01"
          step="0.01"
          placeholder="e.g. 2.00"
          value={autoCashoutInput}
          onChange={(e) => {
            setErrorShake(false);
            handleAutoCashoutInput(e.target.value);
          }}
          className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white font-mono focus:outline-none transition-all ${
            errorShake
              ? 'border-red-500 focus:border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
              : 'border-gray-700 focus:border-cyan-500'
          }`}
        />
        {errorShake && (
          <p className="text-red-500 text-xs mt-1">Must be at least 1.01</p>
        )}
      </div>

      <div
        className={`rounded-xl border bg-gray-950/70 p-3 transition-all ${
          autoBetEnabled ? 'border-cyan-900/70' : 'border-gray-800'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Auto Bet</p>
            <p className="text-[11px] text-gray-500">
              {autoBetEnabled
                ? 'Configurable strategy for the next rounds'
                : 'Disabled. Enable to configure strategy'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAutoBetEnabled(!autoBetEnabled)}
            aria-pressed={autoBetEnabled}
            className={`relative inline-flex h-7 w-14 items-center rounded-full border transition-colors ${
              autoBetEnabled
                ? 'border-cyan-400 bg-cyan-500/20'
                : 'border-gray-700 bg-gray-800'
            }`}
          >
            <span
              className={`ml-1 block h-5 w-5 rounded-full transition-transform ${
                autoBetEnabled
                  ? 'translate-x-6 bg-cyan-400'
                  : 'translate-x-0 bg-gray-500'
              }`}
            />
          </button>
        </div>

        {autoBetEnabled && (
          <div className="mt-3 border-t border-cyan-950/60 pt-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'flat', label: 'Flat' },
                { value: 'martingale', label: 'Martingale' },
                { value: 'paroli', label: 'Paroli' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setAutoBetStrategy(option.value as 'flat' | 'martingale' | 'paroli')
                  }
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                    autoBetStrategy === option.value
                      ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300'
                      : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs text-gray-400">Strategy Multiplier</label>
              <input
                type="number"
                min="1.10"
                step="0.10"
                value={autoBetMultiplier}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  if (!Number.isNaN(parsed) && parsed >= 1.1) {
                    setAutoBetMultiplier(parsed);
                  }
                }}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <p className="mt-2 text-[11px] text-gray-500">
                `Flat` keeps the base bet. `Martingale` increases after a loss. `Paroli`
                increases after a win.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action button */}
      <CashoutButton onPlaceBet={handlePlaceBet} onCashOut={onCashOut} />
    </div>
  );
}
