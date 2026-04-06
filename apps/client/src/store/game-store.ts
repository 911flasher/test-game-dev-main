import { create } from 'zustand';
import { GamePhase, type BotPlayer, type RoundResult } from '@crash/shared';

interface GameState {
  phase: GamePhase;
  roundId: string | null;
  multiplier: number;
  crashPoint: number | null;
  serverSeed: string | null;
  roundStartedAt: number | null;
  bots: BotPlayer[];
  roundHistory: RoundResult[];
  connected: boolean;
  rocketPosition: { x: number; y: number };
}

interface GameActions {
  setPhase: (phase: GamePhase) => void;
  setMultiplier: (multiplier: number) => void;
  setCrashPoint: (crashPoint: number, serverSeed: string) => void;
  setBots: (bots: BotPlayer[]) => void;
  updateBotCashout: (botId: string, at: number) => void;
  addRoundToHistory: (round: RoundResult) => void;
  startRound: (roundId: string, startedAt: number) => void;
  setConnected: (connected: boolean) => void;
  setRocketPosition: (position: { x: number; y: number }) => void;
  resetRound: () => void;
}

const MAX_HISTORY = 50;

export const useGameStore = create<GameState & GameActions>((set) => ({
  // State
  phase: GamePhase.WAITING,
  roundId: null,
  multiplier: 1.0,
  crashPoint: null,
  serverSeed: null,
  roundStartedAt: null,
  bots: [],
  roundHistory: [],
  connected: false,
  rocketPosition: { x: 0, y: 0 },

  // Actions
  setPhase: (phase) => set({ phase }),

  setMultiplier: (multiplier) => set({ multiplier }),

  setCrashPoint: (crashPoint, serverSeed) => set({ crashPoint, serverSeed }),

  setBots: (bots) => set({ bots }),

  updateBotCashout: (botId, at) =>
    set((state) => ({
      bots: state.bots.map((bot) =>
        bot.id === botId ? { ...bot, cashedOutAt: at } : bot,
      ),
    })),

  addRoundToHistory: (round) =>
    set((state) => ({
      roundHistory: [round, ...state.roundHistory].slice(0, MAX_HISTORY),
    })),

  startRound: (roundId, startedAt) =>
    set({
      roundId,
      roundStartedAt: startedAt,
      multiplier: 1.0,
      crashPoint: null,
      serverSeed: null,
    }),

  setConnected: (connected) => set({ connected }),

  setRocketPosition: (rocketPosition) => set({ rocketPosition }),

  resetRound: () =>
    set({
      multiplier: 1.0,
      crashPoint: null,
      serverSeed: null,
      roundStartedAt: null,
      bots: [],
    }),
}));
