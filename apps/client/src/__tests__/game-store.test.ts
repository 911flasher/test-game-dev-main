import { describe, it, expect, beforeEach } from 'vitest';
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../store/game-store.js';
import { usePlayerStore } from '../store/player-store.js';

// Reset stores between tests
beforeEach(() => {
  useGameStore.setState({
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
  });

  usePlayerStore.setState({
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
  });
});

describe('gameStore', () => {
  it('starts in WAITING phase', () => {
    expect(useGameStore.getState().phase).toBe(GamePhase.WAITING);
  });

  it('updates phase', () => {
    useGameStore.getState().setPhase(GamePhase.FLYING);
    expect(useGameStore.getState().phase).toBe(GamePhase.FLYING);
  });

  it('updates multiplier', () => {
    useGameStore.getState().setMultiplier(2.5);
    expect(useGameStore.getState().multiplier).toBe(2.5);
  });

  it('keeps round history capped at 50', () => {
    const store = useGameStore.getState();
    for (let i = 0; i < 60; i++) {
      store.addRoundToHistory({
        roundId: `round-${i}`,
        crashPoint: 2.0,
        hash: 'abc',
        timestamp: Date.now(),
      });
    }
    expect(useGameStore.getState().roundHistory).toHaveLength(50);
  });

  it('adds most recent round to front of history', () => {
    const store = useGameStore.getState();
    store.addRoundToHistory({
      roundId: 'round-1',
      crashPoint: 1.5,
      hash: 'hash1',
      timestamp: 1000,
    });
    store.addRoundToHistory({
      roundId: 'round-2',
      crashPoint: 3.0,
      hash: 'hash2',
      timestamp: 2000,
    });
    expect(useGameStore.getState().roundHistory[0].roundId).toBe('round-2');
  });

  it('updates bot cashout', () => {
    useGameStore.setState({
      bots: [
        { id: 'bot-1', name: 'TestBot', betAmount: 10, cashedOutAt: null },
      ],
    });
    useGameStore.getState().updateBotCashout('bot-1', 2.0);
    expect(useGameStore.getState().bots[0].cashedOutAt).toBe(2.0);
  });

  it('does not affect other bots on cashout update', () => {
    useGameStore.setState({
      bots: [
        { id: 'bot-1', name: 'BotA', betAmount: 10, cashedOutAt: null },
        { id: 'bot-2', name: 'BotB', betAmount: 20, cashedOutAt: null },
      ],
    });
    useGameStore.getState().updateBotCashout('bot-1', 1.5);
    expect(useGameStore.getState().bots[1].cashedOutAt).toBeNull();
  });
});

describe('playerStore', () => {
  it('starts with $1000 balance', () => {
    expect(usePlayerStore.getState().balance).toBe(1000);
  });

  it('deducts bet amount from balance on placeBet', () => {
    usePlayerStore.getState().placeBet(100);
    expect(usePlayerStore.getState().balance).toBe(900);
    expect(usePlayerStore.getState().hasActiveBet).toBe(true);
    expect(usePlayerStore.getState().lastBetAmount).toBe(100);
  });

  it('adds winnings and sets cashedOutAt on cashOut', () => {
    usePlayerStore.getState().placeBet(100);
    usePlayerStore.getState().cashOut(250, 1150, 2.5);
    expect(usePlayerStore.getState().balance).toBe(1150);
    expect(usePlayerStore.getState().cashedOutAt).toBe(2.5);
    expect(usePlayerStore.getState().hasActiveBet).toBe(false);
    expect(usePlayerStore.getState().lastRoundResult).toBe('win');
  });

  it('resets hasActiveBet and cashedOutAt for new round', () => {
    usePlayerStore.setState({ hasActiveBet: true, cashedOutAt: 3.0 });
    usePlayerStore.getState().resetForNewRound();
    expect(usePlayerStore.getState().hasActiveBet).toBe(false);
    expect(usePlayerStore.getState().cashedOutAt).toBeNull();
  });

  it('does not change balance on resetForNewRound', () => {
    usePlayerStore.setState({ balance: 850 });
    usePlayerStore.getState().resetForNewRound();
    expect(usePlayerStore.getState().balance).toBe(850);
  });

  it('sets balance via setBalance', () => {
    usePlayerStore.getState().setBalance(500);
    expect(usePlayerStore.getState().balance).toBe(500);
  });

  it('keeps base bet in flat auto-bet mode', () => {
    usePlayerStore.setState({
      autoBetEnabled: true,
      autoBetStrategy: 'flat',
      betAmount: 25,
      baseBetAmount: 25,
      lastBetAmount: 25,
      lastRoundResult: 'loss',
    });

    usePlayerStore.getState().resetForNewRound();

    expect(usePlayerStore.getState().betAmount).toBe(25);
  });

  it('increases next bet after a martingale loss', () => {
    usePlayerStore.setState({
      autoBetEnabled: true,
      autoBetStrategy: 'martingale',
      autoBetMultiplier: 2.5,
      betAmount: 10,
      baseBetAmount: 10,
      lastBetAmount: 10,
      lastRoundResult: 'loss',
    });

    usePlayerStore.getState().resetForNewRound();

    expect(usePlayerStore.getState().betAmount).toBe(25);
  });

  it('increases next bet after a paroli win', () => {
    usePlayerStore.setState({
      autoBetEnabled: true,
      autoBetStrategy: 'paroli',
      autoBetMultiplier: 2,
      betAmount: 15,
      baseBetAmount: 15,
      lastBetAmount: 15,
      lastRoundResult: 'win',
    });

    usePlayerStore.getState().resetForNewRound();

    expect(usePlayerStore.getState().betAmount).toBe(30);
  });

  it('records a loss only when a bet is active', () => {
    usePlayerStore.getState().recordLoss();
    expect(usePlayerStore.getState().lastRoundResult).toBeNull();

    usePlayerStore.setState({ hasActiveBet: true });
    usePlayerStore.getState().recordLoss();

    expect(usePlayerStore.getState().lastRoundResult).toBe('loss');
  });
});
