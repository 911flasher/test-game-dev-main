import { create } from 'zustand';

interface PlayerState {
  balance: number;
  betAmount: number;
  autoCashoutAt: number | null;
  hasActiveBet: boolean;
  cashedOutAt: number | null;
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
  // State
  balance: 1000,
  betAmount: 10,
  autoCashoutAt: null,
  hasActiveBet: false,
  cashedOutAt: null,

  // Actions
  setBetAmount: (betAmount) => set({ betAmount }),

  setAutoCashout: (autoCashoutAt) => set({ autoCashoutAt }),

  placeBet: (amount) =>
    set((state) => ({
      balance: state.balance - amount,
      hasActiveBet: true,
      cashedOutAt: null,
    })),

  cashOut: (_winnings, balance, at) =>
    set({
      balance,
      hasActiveBet: false,
      cashedOutAt: at,
    }),

  resetForNewRound: () =>
    set({
      hasActiveBet: false,
      cashedOutAt: null,
    }),

  setBalance: (balance) => set({ balance }),
}));
