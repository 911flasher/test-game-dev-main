import { EventEmitter } from 'events';
import { GamePhase } from '@crash/shared';
import { ProvablyFairEngine } from './provably-fair.js';

const WAITING_DURATION = 5000;
const COUNTDOWN_DURATION = 3000;
const POST_CRASH_DELAY = 3000;
const TICK_INTERVAL = 50; // 20Hz
const GROWTH_RATE = 0.00006;


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
    this.fairEngine = new ProvablyFairEngine(options.chainLength ?? 10000, options.seed);
  }

  get phase(): GamePhase { return this._phase; }
  get terminatingHash(): string { return this.fairEngine.terminatingHash; }

  /**
   * Starts a round cycle: WAITING → COUNTDOWN → FLYING → CRASHED.
   * After the post-crash delay the engine transitions back to WAITING and stops,
   * waiting for the next `start()` call to begin a new round.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.startWaiting();
  }

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

  private startWaiting(): void {
    this.currentRound = this.fairEngine.getNextRound();
    this.setPhase(GamePhase.WAITING);
    this.emit('roundWaiting', {
      roundId: this.currentRound.roundId,
      nextHash: this.currentRound.verificationHash,
    });
    this.timer = setTimeout(() => {
      if (this.running) this.startCountdown();
    }, WAITING_DURATION);
  }

  private startCountdown(): void {
    this.setPhase(GamePhase.COUNTDOWN);
    this.emit('countdown', { startsIn: COUNTDOWN_DURATION });
    this.timer = setTimeout(() => {
      if (this.running) this.startFlying();
    }, COUNTDOWN_DURATION);
  }

  private startFlying(): void {
    if (!this.currentRound) return;
    this.roundStartedAt = Date.now();
    this.setPhase(GamePhase.FLYING);
    this.emit('roundStart', { roundId: this.currentRound.roundId, startedAt: this.roundStartedAt });

    // Emit live multiplier ticks at 20 Hz. Crash when multiplier exceeds crash point.
    this.tickTimer = setInterval(() => {
      if (!this.running || !this.currentRound) return;
      const elapsed = Date.now() - this.roundStartedAt;
      const multiplier = getMultiplier(elapsed);
      if (multiplier >= this.currentRound.crashPoint) {
        this.crash();
      } else {
        this.emit('tick', { multiplier, elapsed });
      }
    }, TICK_INTERVAL);
  }

  private crash(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
    if (!this.currentRound) return;
    this.setPhase(GamePhase.CRASHED);
    this.emit('crash', {
      crashPoint: this.currentRound.crashPoint,
      hash: this.currentRound.hash,
      serverSeed: this.currentRound.hash,
      roundId: this.currentRound.roundId,
    });
    this.timer = setTimeout(() => {
      if (this.running) this.startWaiting();
    }, POST_CRASH_DELAY);
  }

  getCurrentMultiplier(): number {
    if (this._phase !== GamePhase.FLYING) return 1.0;
    return getMultiplier(Date.now() - this.roundStartedAt);
  }

  getCurrentRoundId(): string | null {
    return this.currentRound?.roundId ?? null;
  }
}
