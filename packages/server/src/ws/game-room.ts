/**
 * Класс GameRoom.
 * Назначение: Управляет комнатой WebSocket соединений, хранит балансы и ставки игроков.
 * Он подписывается на события движка (CrashEngine) и рассылает обновления клиентам (broadcast).
 * Также обрабатывает сообщения от клиентов (сделать ставку, вывести выигрыш).
 */
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
  // Набор всех активных вебсокет-соединений (клиентов)
  private clients = new Set<WebSocket>();
  // Мапа балансов, где ключ — это сам сокет клиента
  private balances = new Map<WebSocket, number>();
  // Мапа текущих ставок, где ключ — сокет клиента
  private playerBets = new Map<WebSocket, PlayerBet>();
  private roundHistory: RoundResult[] = [];
  private currentBots: BotPlayer[] = [];
  private currentMultiplier = 1.0;
  private currentElapsed = 0;

  constructor() {
    this.engine = new CrashEngine();
    this.botManager = new BotManager();
    // Привязываем слушатели событий от движка игры
    this.wireEngineEvents();
  }

  private wireEngineEvents(): void {
    // Когда начинается фаза ожидания нового раунда
    this.engine.on('roundWaiting', ({ roundId, nextHash }: { roundId: string; nextHash: string }) => {
      // Очищаем ставки предыдущего раунда (те, кто не вывел, уже сгорели при краше)
      this.playerBets.clear();
      this.currentMultiplier = 1.0;
      this.currentElapsed = 0;

      // Генерируем новых ботов для текущего раунда
      this.currentBots = this.botManager.generateBots();

      // Оповещаем всех клиентов
      this.broadcast({ type: 'round:waiting', roundId, nextHash });
      this.broadcast({ type: 'bots:update', bots: this.currentBots });
    });

    // Событие обратного отсчета
    this.engine.on('countdown', ({ startsIn }: { startsIn: number }) => {
      this.broadcast({ type: 'round:countdown', startsIn });
    });

    // Момент непосредственного старта полета (множитель начал расти)
    this.engine.on('roundStart', ({ roundId, startedAt }: { roundId: string; startedAt: number }) => {
      this.broadcast({ type: 'round:start', roundId, startedAt });
    });

    // Тик игрового движка (обновление множителя)
    this.engine.on('tick', ({ multiplier, elapsed }: { multiplier: number; elapsed: number }) => {
      this.currentMultiplier = multiplier;
      this.currentElapsed = elapsed;

      this.broadcast({ type: 'round:tick', multiplier, elapsed });

      // Проверяем и обрабатываем кэшауты ботов, если пришло их время
      const newCashouts = this.botManager.processCashouts(multiplier);
      for (const bot of newCashouts) {
        this.broadcast({ type: 'bot:cashout', botId: bot.id, at: bot.cashedOutAt! });
      }

      // Проверяем, не достиг ли множитель точки авто-кэшаута реальных игроков
      this.processAutoCashouts(multiplier);
    });

    // Событие крушения (краша)
    this.engine.on('crash', ({ crashPoint, serverSeed, hash, roundId }: {
      crashPoint: number;
      serverSeed: string;
      hash: string;
      roundId: string;
    }) => {
      this.broadcast({ type: 'round:crash', crashPoint, serverSeed, hash });

      // Добавляем результат раунда в историю для Provably Fair
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

      // Все активные ставки, которые не были выведены до краша, сгорают
      this.playerBets.clear();
    });
  }

  // Логика автоматического вывода ставки, если множитель достиг лимита игрока
  private processAutoCashouts(multiplier: number): void {
    for (const [client, bet] of this.playerBets.entries()) {
      if (bet.autoCashoutAt !== null && multiplier >= bet.autoCashoutAt) {
        this.executeCashout(client, multiplier);
      }
    }
  }

  // Физическое исполнение вывода ставки: начисление баланса и оповещение клиента
  private executeCashout(client: WebSocket, multiplier: number): void {
    const bet = this.playerBets.get(client);
    if (!bet) return;

    const winnings = bet.amount * multiplier;
    const currentBalance = this.balances.get(client) ?? STARTING_BALANCE;
    const newBalance = currentBalance + winnings;
    // Обновляем баланс и удаляем ставку (игрок больше не в раунде)
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

  // Добавление нового клиента при подключении по WebSocket
  addClient(ws: WebSocket): void {
    this.clients.add(ws);
    // Даем стартовый баланс (мокаем авторизацию)
    this.balances.set(ws, STARTING_BALANCE);

    // Отправляем новому клиенту текущее состояние игры (State Sync)
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

  // Удаление клиента при обрыве соединения
  removeClient(ws: WebSocket): void {
    this.clients.delete(ws);
    this.balances.delete(ws);
    this.playerBets.delete(ws);
  }

  // Обработчик входящих сообщений от WebSocket клиента
  handleMessage(ws: WebSocket, raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.sendError(ws, 'INVALID_JSON', 'Message is not valid JSON');
      return;
    }

    // Валидация формата сообщения через Zod
    const result = clientMessageSchema.safeParse(parsed);
    if (!result.success) {
      this.sendError(ws, 'INVALID_MESSAGE', result.error.message);
      return;
    }

    const msg = result.data;

    // Игрок хочет сделать ставку
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

      // Списываем ставку с баланса сразу
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
    } 
    // Игрок хочет вывести ставку (сделать кэшаут)
    else if (msg.type === 'bet:cashout') {
      if (this.engine.phase !== GamePhase.FLYING) {
        this.sendError(ws, 'INVALID_PHASE', 'Cashout only available during flying phase');
        return;
      }

      if (!this.playerBets.has(ws)) {
        this.sendError(ws, 'NO_BET', 'No active bet to cash out');
        return;
      }

      // Сервер сам решает, по какому множителю проходит вывод средств 
      // (это защищает от читов клиента)
      const multiplier = this.engine.getCurrentMultiplier();
      this.executeCashout(ws, multiplier);
    }
  }

  // Утилита для отправки ошибки клиенту
  private sendError(ws: WebSocket, code: string, message: string): void {
    const msg: ServerMessage = { type: 'error', code, message };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  // Утилита для рассылки сообщения всем подключенным клиентам
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
