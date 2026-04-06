/**
 * Класс CrashEngine.
 * Назначение: Ядро игровой логики Crash-игры на сервере.
 * Управляет сменой фаз (Ожидание -> Отсчет -> Полет -> Краш), таймерами, 
 * вычислением множителя и генерацией честных результатов (Provably Fair).
 * Генерирует события, которые слушает GameRoom и рассылает клиентам.
 */
import { EventEmitter } from 'events';
import { GamePhase } from '@crash/shared';
import { ProvablyFairEngine } from './provably-fair.js';

// Константы длительности фаз в миллисекундах
const WAITING_DURATION = 5000;
const COUNTDOWN_DURATION = 3000;
const POST_CRASH_DELAY = 3000;
const TICK_INTERVAL = 50; // Частота тика сервера (20Hz)
const GROWTH_RATE = 0.00006; // Константа скорости роста кривой

/**
 * Функция вычисления множителя на основе прошедшего времени полета.
 * Использует экспоненциальный рост (e ^ (время * скорость_роста)).
 */
export function getMultiplier(elapsedMs: number): number {
  return Math.pow(Math.E, elapsedMs * GROWTH_RATE);
}

interface CrashEngineOptions {
  chainLength?: number;
  seed?: string;
}

export class CrashEngine extends EventEmitter {
  private fairEngine: ProvablyFairEngine;
  private _phase: GamePhase = GamePhase.WAITING;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private roundStartedAt = 0;
  private currentRound: { roundId: string; hash: string; verificationHash: string; crashPoint: number } | null = null;
  private running = false;

  constructor(options: CrashEngineOptions = {}) {
    super();
    // Инициализируем систему доказуемой честности (Provably Fair) 
    // с цепочкой хешей (например, 10000 раундов)
    this.fairEngine = new ProvablyFairEngine(options.chainLength ?? 10000, options.seed);
  }

  get phase(): GamePhase { return this._phase; }
  get terminatingHash(): string { return this.fairEngine.terminatingHash; }

  /**
   * Запуск бесконечного цикла игры: WAITING → COUNTDOWN → FLYING → CRASHED.
   * Цикл будет продолжаться сам по себе, переключая фазы по таймаутам.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.startWaiting();
  }

  // Остановка игрового цикла (используется при завершении работы сервера)
  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.timer = null;
    this.tickTimer = null;
  }

  private setPhase(phase: GamePhase): void {
    this._phase = phase;
    this.emit('phaseChange', phase);
  }

  // Фаза 1: Ожидание новых ставок
  private startWaiting(): void {
    // Получаем точку краша и хэши для текущего раунда из Provably Fair движка
    this.currentRound = this.fairEngine.getNextRound();
    this.setPhase(GamePhase.WAITING);
    
    // Эмитим событие с хешем верификации (он виден игрокам ДО краша, чтобы доказать честность)
    this.emit('roundWaiting', {
      roundId: this.currentRound.roundId,
      nextHash: this.currentRound.verificationHash,
    });

    this.timer = setTimeout(() => {
      if (this.running) this.startCountdown();
    }, WAITING_DURATION);
  }

  // Фаза 2: Обратный отсчет перед взлетом (ставки больше не принимаются)
  private startCountdown(): void {
    this.setPhase(GamePhase.COUNTDOWN);
    this.emit('countdown', { startsIn: COUNTDOWN_DURATION });
    this.timer = setTimeout(() => {
      if (this.running) this.startFlying();
    }, COUNTDOWN_DURATION);
  }

  // Фаза 3: Ракета летит, множитель растет
  private startFlying(): void {
    if (!this.currentRound) return;
    this.roundStartedAt = Date.now();
    this.setPhase(GamePhase.FLYING);
    this.emit('roundStart', { roundId: this.currentRound.roundId, startedAt: this.roundStartedAt });

    // Запускаем тики сервера (20 раз в секунду)
    this.tickTimer = setInterval(() => {
      if (!this.running || !this.currentRound) return;
      
      const elapsed = Date.now() - this.roundStartedAt;
      const multiplier = getMultiplier(elapsed);
      
      // Если текущий множитель достиг или превысил точку краша — взрываем ракету
      if (multiplier >= this.currentRound.crashPoint) {
        this.crash();
      } else {
        // Иначе рассылаем текущий множитель клиентам
        this.emit('tick', { multiplier, elapsed });
      }
    }, TICK_INTERVAL);
  }

  // Фаза 4: Краш (Ракета взорвалась)
  private crash(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
    if (!this.currentRound) return;
    
    this.setPhase(GamePhase.CRASHED);
    
    // Эмитим событие краша. Раскрываем оригинальный serverSeed (hash), 
    // чтобы клиенты могли проверить его соответствие verificationHash.
    this.emit('crash', {
      crashPoint: this.currentRound.crashPoint,
      hash: this.currentRound.hash,
      serverSeed: this.currentRound.hash,
      roundId: this.currentRound.roundId,
    });

    // Запускаем таймер задержки перед началом следующего раунда
    this.timer = setTimeout(() => {
      if (this.running) this.startWaiting();
    }, POST_CRASH_DELAY);
  }

  // Публичный метод для получения текущего множителя (используется при кэшауте игрока)
  getCurrentMultiplier(): number {
    if (this._phase !== GamePhase.FLYING) return 1.0;
    return getMultiplier(Date.now() - this.roundStartedAt);
  }

  getCurrentRoundId(): string | null {
    return this.currentRound?.roundId ?? null;
  }
}
