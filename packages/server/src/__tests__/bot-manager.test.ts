import { describe, it, expect } from 'vitest';
import { BotManager } from '../engine/bot-manager.js';

describe('BotManager', () => {
  it('generates 4-8 bots per round', () => {
    const manager = new BotManager();
    const bots = manager.generateBots();
    expect(bots.length).toBeGreaterThanOrEqual(4);
    expect(bots.length).toBeLessThanOrEqual(8);
  });

  it('each bot has required fields', () => {
    const manager = new BotManager();
    const bots = manager.generateBots();
    for (const bot of bots) {
      expect(bot).toHaveProperty('id');
      expect(bot).toHaveProperty('name');
      expect(bot).toHaveProperty('betAmount');
      expect(bot.betAmount).toBeGreaterThanOrEqual(5);
      expect(bot.betAmount).toBeLessThanOrEqual(500);
      expect(bot.cashedOutAt).toBeNull();
    }
  });

  it('generates cashout targets for bots', () => {
    const manager = new BotManager();
    const bots = manager.generateBots();
    const targets = manager.getCashoutTargets();
    expect(Object.keys(targets).length).toBe(bots.length);
    for (const target of Object.values(targets)) {
      if (target !== null) {
        expect(target).toBeGreaterThanOrEqual(1.1);
      }
    }
  });

  it('returns bots that should cash out at a given multiplier', () => {
    const manager = new BotManager();
    manager.generateBots();
    const cashedOut = manager.processCashouts(5.0);
    expect(Array.isArray(cashedOut)).toBe(true);
  });
});
