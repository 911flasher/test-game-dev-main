import { BotPlayer } from '@crash/shared';

const BOT_NAMES = [
  'CryptoKing', 'MoonShot', 'DiamondHands', 'RocketRider',
  'SatoshiFan', 'DegenerateApe', 'WhaleWatch', 'LuckyDegen',
  'NightOwl', 'HighRoller', 'CoolCat', 'GoldRush',
  'StarChaser', 'CosmicBet', 'NebulaNerd', 'GalaxyGambler',
];

export class BotManager {
  private bots: BotPlayer[] = [];
  private cashoutTargets: Record<string, number | null> = {};
  private cashedOutSet = new Set<string>();

  generateBots(): BotPlayer[] {
    const count = 4 + Math.floor(Math.random() * 5);
    const shuffled = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    this.bots = [];
    this.cashoutTargets = {};
    this.cashedOutSet.clear();

    for (let i = 0; i < count; i++) {
      const id = `bot-${i}-${Date.now()}`;
      const betAmount = Math.round(Math.exp(Math.random() * Math.log(500 / 5) + Math.log(5)));
      const bot: BotPlayer = {
        id,
        name: shuffled[i % shuffled.length],
        betAmount: Math.max(5, Math.min(500, betAmount)),
        cashedOutAt: null,
      };
      this.bots.push(bot);

      const r = Math.random();
      if (r < 0.15) this.cashoutTargets[id] = null;
      else if (r < 0.45) this.cashoutTargets[id] = 1.1 + Math.random() * 0.9;
      else if (r < 0.75) this.cashoutTargets[id] = 2 + Math.random() * 3;
      else this.cashoutTargets[id] = 5 + Math.random() * 15;
    }
    return [...this.bots];
  }

  getCashoutTargets(): Record<string, number | null> { return { ...this.cashoutTargets }; }

  processCashouts(currentMultiplier: number): BotPlayer[] {
    const newCashouts: BotPlayer[] = [];
    for (const bot of this.bots) {
      if (this.cashedOutSet.has(bot.id)) continue;
      const target = this.cashoutTargets[bot.id];
      if (target !== null && currentMultiplier >= target) {
        bot.cashedOutAt = Math.round(target * 100) / 100;
        this.cashedOutSet.add(bot.id);
        newCashouts.push({ ...bot });
      }
    }
    return newCashouts;
  }

  getBots(): BotPlayer[] { return [...this.bots]; }
  reset(): void { this.bots = []; this.cashoutTargets = {}; this.cashedOutSet.clear(); }
}
