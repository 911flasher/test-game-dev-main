import { createHash } from 'crypto';
import { randomBytes } from 'crypto';

// Server-side synchronous SHA-256 (Node.js only)
export function sha256Server(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function generateSeed(): string {
  return randomBytes(32).toString('hex');
}

export function buildHashChain(seed: string, length: number): string[] {
  const chain: string[] = [seed];
  for (let i = 1; i < length; i++) {
    chain.push(sha256Server(chain[i - 1]));
  }
  return chain;
}

export function getCrashPoint(hash: string): number {
  const h = BigInt('0x' + hash.slice(0, 13));
  if (h % 33n === 0n) return 1.0;
  const e = 2n ** 52n;
  const result = Number((100n * e - h) / (e - h)) / 100;
  return Math.min(100, Math.max(1, result));
}

interface RoundData {
  roundId: string;
  hash: string;
  verificationHash: string;
  crashPoint: number;
}

export class ProvablyFairEngine {
  private chain: string[];
  private currentIndex: number;
  private roundCounter = 0;
  public readonly terminatingHash: string;

  constructor(chainLength: number, seed?: string) {
    const actualSeed = seed ?? generateSeed();
    this.chain = buildHashChain(actualSeed, chainLength);
    this.terminatingHash = this.chain[this.chain.length - 1];
    this.currentIndex = this.chain.length - 2;
  }

  getNextRound(): RoundData {
    if (this.currentIndex < 0) {
      throw new Error('Hash chain exhausted');
    }
    const hash = this.chain[this.currentIndex];
    const verificationHash = this.chain[this.currentIndex + 1];
    this.currentIndex--;
    this.roundCounter++;

    return {
      roundId: `round-${this.roundCounter}`,
      hash,
      verificationHash,
      crashPoint: getCrashPoint(hash),
    };
  }

  getRoundsRemaining(): number {
    return this.currentIndex + 1;
  }
}
