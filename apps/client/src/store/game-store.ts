/**
 * Глобальное хранилище состояния игры (Zustand).
 * Назначение: хранит синхронизированное с сервером состояние текущего раунда, 
 * множитель, историю раундов, статус подключения и позицию ракеты.
 */
import { create } from 'zustand';
import { GamePhase, type BotPlayer, type RoundResult } from '@crash/shared';

interface GameState {
  phase: GamePhase;           // Текущая стадия игры (Ожидание, Отсчет, Полет, Краш)
  roundId: string | null;     // Уникальный идентификатор текущего раунда
  multiplier: number;         // Текущий множитель
  crashPoint: number | null;  // Точка краша (доступна только после краша)
  serverSeed: string | null;  // Раскрытый сид сервера (для проверки Provably Fair)
  roundStartedAt: number | null; // Временная метка начала полета
  bots: BotPlayer[];          // Список ботов в текущем раунде
  roundHistory: RoundResult[];// История предыдущих раундов (крашей)
  connected: boolean;         // Статус подключения к WebSocket
  rocketPosition: { x: number; y: number }; // Экранные координаты ракеты (передаются из Canvas в Rive)
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

// Храним максимум 50 раундов в истории, чтобы не перегружать память
const MAX_HISTORY = 50;

export const useGameStore = create<GameState & GameActions>((set) => ({
  // Начальное состояние (State)
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

  // Действия (Actions) для изменения состояния
  setPhase: (phase) => set({ phase }),

  setMultiplier: (multiplier) => set({ multiplier }),

  setCrashPoint: (crashPoint, serverSeed) => set({ crashPoint, serverSeed }),

  setBots: (bots) => set({ bots }),

  // Обновляет статус конкретного бота, когда он делает вывод (cashout)
  updateBotCashout: (botId, at) =>
    set((state) => ({
      bots: state.bots.map((bot) =>
        bot.id === botId ? { ...bot, cashedOutAt: at } : bot,
      ),
    })),

  // Добавляет последний раунд в историю (в начало списка)
  addRoundToHistory: (round) =>
    set((state) => ({
      roundHistory: [round, ...state.roundHistory].slice(0, MAX_HISTORY),
    })),

  // Вызывается при взлете (старт роста множителя)
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

  // Сброс локального состояния перед новым раундом
  resetRound: () =>
    set({
      multiplier: 1.0,
      crashPoint: null,
      serverSeed: null,
      roundStartedAt: null,
      bots: [],
    }),
}));
