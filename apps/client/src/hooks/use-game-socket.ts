import { useEffect, useRef, useCallback } from 'react';
import { GamePhase, type ClientMessage, type RoundResult } from '@crash/shared';
import { WsClient } from '../lib/ws-client.js';
import { useGameStore } from '../store/game-store.js';
import { usePlayerStore } from '../store/player-store.js';

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

async function fetchHistory(): Promise<RoundResult[]> {
  try {
    const res = await fetch('/api/history');
    if (!res.ok) return [];
    return (await res.json()) as RoundResult[];
  } catch {
    return [];
  }
}

export function useGameSocket() {
  const wsRef = useRef<WsClient | null>(null);

  useEffect(() => {
    const client = new WsClient(WS_URL);

    const removeHandler = client.onMessage((msg) => {
      const game = useGameStore.getState();
      const player = usePlayerStore.getState();

      switch (msg.type) {
        case 'round:waiting':
          game.setPhase(GamePhase.WAITING);
          game.resetRound();
          player.resetForNewRound();
          break;

        case 'round:countdown':
          game.setPhase(GamePhase.COUNTDOWN);
          break;

        case 'round:start':
          game.setPhase(GamePhase.FLYING);
          game.startRound(msg.roundId, msg.startedAt);
          break;

        case 'round:tick':
          game.setMultiplier(msg.multiplier);
          break;

        case 'round:crash': {
          game.setPhase(GamePhase.CRASHED);
          game.setCrashPoint(msg.crashPoint, msg.serverSeed);
          const roundId = useGameStore.getState().roundId;
          if (roundId) {
            game.addRoundToHistory({
              roundId,
              crashPoint: msg.crashPoint,
              hash: msg.hash,
              timestamp: Date.now(),
            });
          }
          break;
        }

        case 'bots:update':
          game.setBots(msg.bots);
          break;

        case 'bot:cashout':
          game.updateBotCashout(msg.botId, msg.at);
          break;

        case 'player:bet_accepted':
          player.setBalance(msg.balance);
          break;

        case 'player:cashout_accepted':
          player.cashOut(msg.winnings, msg.balance, msg.at);
          break;

        case 'state:sync':
          game.setPhase(msg.phase);
          game.setMultiplier(msg.multiplier);
          game.setBots(msg.bots);
          if (msg.roundId) {
            useGameStore.setState({ roundId: msg.roundId });
          }
          if (msg.playerBet) {
            usePlayerStore.setState({
              hasActiveBet: true,
              autoCashoutAt: msg.playerBet.autoCashoutAt,
            });
          }
          // Fetch history via REST
          fetchHistory().then((history) => {
            useGameStore.setState({ roundHistory: history });
          });
          break;

        case 'error':
          console.error('[GameSocket] Server error:', msg.code, msg.message);
          break;
      }
    });

    // Track connected state
    client.connect();
    useGameStore.getState().setConnected(true);

    wsRef.current = client;

    return () => {
      removeHandler();
      client.disconnect();
      useGameStore.getState().setConnected(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    wsRef.current?.send(msg);
  }, []);

  return { send };
}
