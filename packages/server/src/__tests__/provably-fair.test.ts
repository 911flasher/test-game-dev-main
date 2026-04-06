import { describe, it, expect } from 'vitest';
import {
  generateSeed,
  buildHashChain,
  getCrashPoint,
  ProvablyFairEngine,
  sha256Server,
} from '../engine/provably-fair.js';

describe('getCrashPoint', () => {
  it('returns 1.0 for instant crash hashes (h % 33 === 0)', () => {
    // 0x21 = 33 decimal, so 33 % 33 === 0 → instant crash
    const hash = '0000000000021abcdef0123456789abcdef0123456789abcdef0123456789a';
    expect(getCrashPoint(hash)).toBe(1.0);
    // Also test zero
    const zeroHash = '0000000000000abcdef0123456789abcdef0123456789abcdef0123456789a';
    expect(getCrashPoint(zeroHash)).toBe(1.0);
  });

  it('returns a value >= 1.0 for all inputs', () => {
    const testHashes = [
      'a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789a',
      'fffffffffffff0000000000000000000000000000000000000000000000000000',
      '0000000000001abcdef0123456789abcdef0123456789abcdef0123456789abcd',
    ];
    for (const hash of testHashes) {
      expect(getCrashPoint(hash)).toBeGreaterThanOrEqual(1.0);
    }
  });

  it('returns values capped around 100x', () => {
    const nearMaxHash = 'fffffffffffef' + '0'.repeat(51);
    const result = getCrashPoint(nearMaxHash);
    expect(result).toBeLessThanOrEqual(101);
    expect(result).toBeGreaterThan(1);
  });
});

describe('buildHashChain', () => {
  it('generates a chain where each hash is sha256 of the previous', () => {
    const seed = 'test-seed-123';
    const chain = buildHashChain(seed, 5);
    expect(chain).toHaveLength(5);
    expect(chain[0]).toBe(seed);
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i]).toBe(sha256Server(chain[i - 1]));
    }
  });

  it('terminating hash is the last element', () => {
    const seed = 'another-seed';
    const chain = buildHashChain(seed, 10);
    expect(chain[chain.length - 1]).toBe(sha256Server(chain[chain.length - 2]));
  });
});

describe('ProvablyFairEngine', () => {
  it('plays rounds in reverse order from the hash chain', () => {
    const engine = new ProvablyFairEngine(10);
    const firstRound = engine.getNextRound();
    const secondRound = engine.getNextRound();

    expect(firstRound.verificationHash).toBe(engine.terminatingHash);
    expect(sha256Server(secondRound.hash)).toBe(firstRound.hash);
  });

  it('produces valid crash points for each round', () => {
    const engine = new ProvablyFairEngine(100);
    for (let i = 0; i < 50; i++) {
      const round = engine.getNextRound();
      expect(round.crashPoint).toBeGreaterThanOrEqual(1.0);
      expect(round.crashPoint).toBeLessThanOrEqual(101);
      expect(round.hash).toBeTruthy();
      expect(round.roundId).toBeTruthy();
    }
  });

  it('exposes terminatingHash for public verification', () => {
    const engine = new ProvablyFairEngine(10);
    expect(engine.terminatingHash).toBeTruthy();
    expect(typeof engine.terminatingHash).toBe('string');
  });
});
