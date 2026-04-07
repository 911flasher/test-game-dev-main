/**
 * Локальное хранилище данных текущего игрока (Zustand).
 * Назначение: хранит состояние баланса игрока, параметры его текущей ставки
 * и данные о совершенном автовыводе. Отделено от game-store для удобства.
 */
import { create } from 'zustand';

export type AutoBetStrategy = 'flat' | 'martingale' | 'paroli';
type RoundResult = 'win' | 'loss' | null;

function roundCurrencyAmount(amount: number): number {
  return Math.max(0.01, Number(amount.toFixed(2)));
}

interface PlayerState {
  balance: number;            // Текущий баланс пользователя
  betAmount: number;          // Сумма, которую игрок хочет поставить
  baseBetAmount: number;      // Базовая сумма, к которой возвращаются стратегии
  autoCashoutAt: number | null; // Целевой множитель для авто-вывода (кэшаута)
  hasActiveBet: boolean;      // Сделал ли игрок ставку в текущем раунде
  cashedOutAt: number | null; // Множитель, на котором игрок успел вывести деньги (null, если не вывел или проиграл)
  autoBetEnabled: boolean;
  autoBetStrategy: AutoBetStrategy;
  autoBetMultiplier: number;
  lastBetAmount: number | null;
  lastRoundResult: RoundResult;
}

interface PlayerActions {
  setBetAmount: (amount: number) => void;
  setAutoCashout: (at: number | null) => void;
  setAutoBetEnabled: (enabled: boolean) => void;
  setAutoBetStrategy: (strategy: AutoBetStrategy) => void;
  setAutoBetMultiplier: (multiplier: number) => void;
  placeBet: (amount: number) => void;
  cashOut: (winnings: number, balance: number, at: number) => void;
  recordLoss: () => void;
  resetForNewRound: () => void;
  setBalance: (balance: number) => void;
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set) => ({
  // Начальное состояние (State)
  balance: 1000,
  betAmount: 10,
  baseBetAmount: 10,
  autoCashoutAt: null,
  hasActiveBet: false,
  cashedOutAt: null,
  autoBetEnabled: false,
  autoBetStrategy: 'flat',
  autoBetMultiplier: 2,
  lastBetAmount: null,
  lastRoundResult: null,

  // Действия (Actions)
  setBetAmount: (betAmount) => {
    const roundedAmount = roundCurrencyAmount(betAmount);
    set({
      betAmount: roundedAmount,
      baseBetAmount: roundedAmount,
    });
  },

  setAutoCashout: (autoCashoutAt) => set({ autoCashoutAt }),

  setAutoBetEnabled: (autoBetEnabled) => set({ autoBetEnabled }),

  setAutoBetStrategy: (autoBetStrategy) => set({ autoBetStrategy }),

  setAutoBetMultiplier: (autoBetMultiplier) =>
    set({ autoBetMultiplier: Math.max(1.1, Number(autoBetMultiplier.toFixed(2))) }),

  // Локально фиксируем ставку и уменьшаем баланс (до ответа сервера для отзывчивости)
  placeBet: (amount) =>
    set((state) => ({
      balance: state.balance - amount,
      hasActiveBet: true,
      cashedOutAt: null,
      lastBetAmount: amount,
      lastRoundResult: null,
    })),

  // Локально фиксируем успешный вывод средств (по ответу от сервера)
  cashOut: (_winnings, balance, at) =>
    set({
      balance,
      hasActiveBet: false,
      cashedOutAt: at,
      lastRoundResult: 'win',
    }),

  recordLoss: () =>
    set((state) => (state.hasActiveBet ? { lastRoundResult: 'loss' } : {})),

  // Сброс ставки и статуса вывода перед началом новой игры
  resetForNewRound: () =>
    set((state) => {
      if (!state.autoBetEnabled) {
        return {
          hasActiveBet: false,
          cashedOutAt: null,
          lastRoundResult: null,
        };
      }

      const baseBetAmount = roundCurrencyAmount(state.baseBetAmount);
      const lastBetAmount = state.lastBetAmount ?? baseBetAmount;
      let nextBetAmount = baseBetAmount;

      if (state.autoBetStrategy === 'martingale' && state.lastRoundResult === 'loss') {
        nextBetAmount = roundCurrencyAmount(lastBetAmount * state.autoBetMultiplier);
      } else if (state.autoBetStrategy === 'paroli' && state.lastRoundResult === 'win') {
        nextBetAmount = roundCurrencyAmount(lastBetAmount * state.autoBetMultiplier);
      }

      return {
        betAmount: nextBetAmount,
        hasActiveBet: false,
        cashedOutAt: null,
        lastRoundResult: null,
      };
    }),

  // Синхронизация баланса (обычно при первичном подключении к сокету)
  setBalance: (balance) => set({ balance }),
}));
