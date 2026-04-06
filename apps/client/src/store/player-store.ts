/**
 * Локальное хранилище данных текущего игрока (Zustand).
 * Назначение: хранит состояние баланса игрока, параметры его текущей ставки
 * и данные о совершенном автовыводе. Отделено от game-store для удобства.
 */
import { create } from 'zustand';

interface PlayerState {
  balance: number;            // Текущий баланс пользователя
  betAmount: number;          // Сумма, которую игрок хочет поставить
  autoCashoutAt: number | null; // Целевой множитель для авто-вывода (кэшаута)
  hasActiveBet: boolean;      // Сделал ли игрок ставку в текущем раунде
  cashedOutAt: number | null; // Множитель, на котором игрок успел вывести деньги (null, если не вывел или проиграл)
}

interface PlayerActions {
  setBetAmount: (amount: number) => void;
  setAutoCashout: (at: number | null) => void;
  placeBet: (amount: number) => void;
  cashOut: (winnings: number, balance: number, at: number) => void;
  resetForNewRound: () => void;
  setBalance: (balance: number) => void;
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set) => ({
  // Начальное состояние (State)
  balance: 1000,
  betAmount: 10,
  autoCashoutAt: null,
  hasActiveBet: false,
  cashedOutAt: null,

  // Действия (Actions)
  setBetAmount: (betAmount) => set({ betAmount }),

  setAutoCashout: (autoCashoutAt) => set({ autoCashoutAt }),

  // Локально фиксируем ставку и уменьшаем баланс (до ответа сервера для отзывчивости)
  placeBet: (amount) =>
    set((state) => ({
      balance: state.balance - amount,
      hasActiveBet: true,
      cashedOutAt: null,
    })),

  // Локально фиксируем успешный вывод средств (по ответу от сервера)
  cashOut: (_winnings, balance, at) =>
    set({
      balance,
      hasActiveBet: false,
      cashedOutAt: at,
    }),

  // Сброс ставки и статуса вывода перед началом новой игры
  resetForNewRound: () =>
    set({
      hasActiveBet: false,
      cashedOutAt: null,
    }),

  // Синхронизация баланса (обычно при первичном подключении к сокету)
  setBalance: (balance) => set({ balance }),
}));
