import { WebSocket } from 'ws';
import { GamePhase, type BotPlayer, type RoundResult, clientMessageSchema, type ServerMessage } from '@crash/shared';
import { CrashEngine } from '../engine/crash-engine.js';
import { BotManager } from '../engine/bot-manager.js';

const STARTING_BALANCE = 1000;
const MAX_HISTORY = 50;

interface PlayerBet {
  amount: number;
  autoCashoutAt: number | null;
}

export class GameRoom {
  private engine: CrashEngine;
  private botManager: BotManager;
  private clients = new Set<WebSocket>();
  private balances = new Map<WebSocket, number>();
  private playerBets = new Map<WebSocket, PlayerBet>();
  private roundHistory: RoundResult[] = [];
  private currentBots: BotPlayer[] = [];
  private currentMultiplier = 1.0;
  private currentElapsed = 0;

  constructor() {
    this.engine = new CrashEngine();
    this.botManager = new BotManager();
    this.wireEngineEvents();
  }

  private wireEngineEvents(): void {
    this.engine.on('roundWaiting', ({ roundId, nextHash }: { roundId: string; nextHash: string }) => {
      // Clear all player bets on new round
      this.playerBets.clear();
      this.currentMultiplier = 1.0;
      this.currentElapsed = 0;

      // Generate bots for the new round
      this.currentBots = this.botManager.generateBots();

      this.broadcast({ type: 'round:waiting', roundId, nextHash });
      this.broadcast({ type: 'bots:update', bots: this.currentBots });
    });

    this.engine.on('countdown', ({ startsIn }: { startsIn: number }) => {
      this.broadcast({ type: 'round:countdown', startsIn });
    });

    this.engine.on('roundStart', ({ roundId, startedAt }: { roundId: string; startedAt: number }) => {
      this.broadcast({ type: 'round:start', roundId, startedAt });
    });

    this.engine.on('tick', ({ multiplier, elapsed }: { multiplier: number; elapsed: number }) => {
      this.currentMultiplier = multiplier;
      this.currentElapsed = elapsed;

      this.broadcast({ type: 'round:tick', multiplier, elapsed });

      // Process bot cashouts
      const newCashouts = this.botManager.processCashouts(multiplier);
      for (const bot of newCashouts) {
        this.broadcast({ type: 'bot:cashout', botId: bot.id, at: bot.cashedOutAt! });
      }

      // Process player auto-cashouts
      this.processAutoCashouts(multiplier);
    });

    this.engine.on('crash', ({ crashPoint, serverSeed, hash, roundId }: {
      crashPoint: number;
      serverSeed: string;
      hash: string;
      roundId: string;
    }) => {
      this.broadcast({ type: 'round:crash', crashPoint, serverSeed, hash });

      // Add to history
      const result: RoundResult = {
        roundId,
        crashPoint,
        hash,
        timestamp: Date.now(),
      };
      this.roundHistory.unshift(result);
      if (this.roundHistory.length > MAX_HISTORY) {
        this.roundHistory = this.roundHistory.slice(0, MAX_HISTORY);
      }

      // Clear all remaining player bets (players who didn't cash out lost)
      this.playerBets.clear();
    });
  }

  private processAutoCashouts(multiplier: number): void {
    for (const [client, bet] of this.playerBets.entries()) {
      if (bet.autoCashoutAt !== null && multiplier >= bet.autoCashoutAt) {
        this.executeCashout(client, multiplier);
      }
    }
  }

  private executeCashout(client: WebSocket, multiplier: number): void {
    const bet = this.playerBets.get(client);
    if (!bet) return;

    const winnings = bet.amount * multiplier;
    const currentBalance = this.balances.get(client) ?? STARTING_BALANCE;
    const newBalance = currentBalance + winnings;
    this.balances.set(client, newBalance);
    this.playerBets.delete(client);

    const msg: ServerMessage = {
      type: 'player:cashout_accepted',
      winnings,
      balance: newBalance,
      at: multiplier,
    };

    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(msg));
    }
  }

  addClient(ws: WebSocket): void {
    this.clients.add(ws);
    this.balances.set(ws, STARTING_BALANCE);

    // Send state sync
    const syncMsg: ServerMessage = {
      type: 'state:sync',
      phase: this.engine.phase,
      roundId: this.engine.getCurrentRoundId(),
      multiplier: this.currentMultiplier,
      elapsed: this.currentElapsed,
      bots: this.currentBots,
      playerBet: this.playerBets.get(ws)
        ? {
            amount: this.playerBets.get(ws)!.amount,
            autoCashoutAt: this.playerBets.get(ws)!.autoCashoutAt,
          }
        : null,
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(syncMsg));
    }
  }

  removeClient(ws: WebSocket): void {
    this.clients.delete(ws);
    this.balances.delete(ws);
    this.playerBets.delete(ws);
  }

  handleMessage(ws: WebSocket, raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.sendError(ws, 'INVALID_JSON', 'Message is not valid JSON');
      return;
    }

    const result = clientMessageSchema.safeParse(parsed);
    if (!result.success) {
      this.sendError(ws, 'INVALID_MESSAGE', result.error.message);
      return;
    }

    const msg = result.data;

    if (msg.type === 'bet:place') {
      if (this.engine.phase !== GamePhase.WAITING) {
        this.sendError(ws, 'INVALID_PHASE', 'Bets only accepted during waiting phase');
        return;
      }

      if (this.playerBets.has(ws)) {
        this.sendError(ws, 'BET_EXISTS', 'You already have an active bet');
        return;
      }

      const balance = this.balances.get(ws) ?? STARTING_BALANCE;
      if (msg.amount > balance) {
        this.sendError(ws, 'INSUFFICIENT_BALANCE', 'Insufficient balance');
        return;
      }

      const newBalance = balance - msg.amount;
      this.balances.set(ws, newBalance);
      this.playerBets.set(ws, {
        amount: msg.amount,
        autoCashoutAt: msg.autoCashoutAt ?? null,
      });

      const response: ServerMessage = {
        type: 'player:bet_accepted',
        balance: newBalance,
      };

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(response));
      }
    } else if (msg.type === 'bet:cashout') {
      if (this.engine.phase !== GamePhase.FLYING) {
        this.sendError(ws, 'INVALID_PHASE', 'Cashout only available during flying phase');
        return;
      }

      if (!this.playerBets.has(ws)) {
        this.sendError(ws, 'NO_BET', 'No active bet to cash out');
        return;
      }

      // Server determines multiplier at processing time
      const multiplier = this.engine.getCurrentMultiplier();
      this.executeCashout(ws, multiplier);
    }
  }

  private sendError(ws: WebSocket, code: string, message: string): void {
    const msg: ServerMessage = { type: 'error', code, message };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  private broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  start(): void {
    this.engine.start();
  }

  getHistory(): RoundResult[] {
    return [...this.roundHistory];
  }

  getTerminatingHash(): string {
    return this.engine.terminatingHash;
  }
}
