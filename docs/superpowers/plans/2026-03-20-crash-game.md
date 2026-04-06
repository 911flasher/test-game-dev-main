# Crash Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a provably fair Crash game (Aviator-style) with rocket/space theme, PixiJS canvas, Rive animations, React HUD, and Fastify server.

**Architecture:** pnpm monorepo with three packages — `packages/shared` (Zod schemas + types), `packages/server` (Fastify + WebSocket game engine), `apps/client` (React 19 + PixiJS + Rive + Zustand). Server generates provably fair crash points via hash chain, broadcasts round state over WebSocket. Client interpolates multiplier at 60fps, renders curve on PixiJS canvas, overlays Rive rocket animation via CSS positioning, and shows React HUD for betting/social.

**Tech Stack:** TypeScript strict, React 19, PixiJS 8 + @pixi/react, Rive (@rive-app/react-canvas), Zustand 5, Fastify 5, Zod, Vite, Tailwind CSS 4, Vitest

**Spec:** `docs/superpowers/specs/2026-03-20-crash-game-design.md`

---

## File Map

### `packages/shared/`
| File | Responsibility |
|------|---------------|
| `src/game-state.ts` | GamePhase enum, BotPlayer/RoundResult types |
| `src/messages.ts` | Zod schemas for all WS messages (server→client, client→server) |
| `src/verification.ts` | Client-side hash chain verification utility |
| `src/index.ts` | Re-exports |

### `packages/server/`
| File | Responsibility |
|------|---------------|
| `src/engine/provably-fair.ts` | Hash chain generation, crash point calculation |
| `src/engine/crash-engine.ts` | Round lifecycle state machine (WAITING→COUNTDOWN→FLYING→CRASHED) |
| `src/engine/bot-manager.ts` | Generate bot players, random bets, cashout timing |
| `src/ws/game-room.ts` | WebSocket room — broadcast messages, handle player bets/cashouts |
| `src/routes/history.ts` | GET /api/history |
| `src/routes/verify.ts` | GET /api/verify/:roundId |
| `src/index.ts` | Fastify bootstrap with WS + CORS + routes |
| `src/__tests__/provably-fair.test.ts` | Hash chain + crash point tests |
| `src/__tests__/crash-engine.test.ts` | Round lifecycle tests |
| `src/__tests__/bot-manager.test.ts` | Bot generation tests |

### `apps/client/`
| File | Responsibility |
|------|---------------|
| `src/store/game-store.ts` | Zustand: game phase, multiplier, bots, history, rocket position |
| `src/store/player-store.ts` | Zustand: balance, bet amount, active bet state |
| `src/lib/ws-client.ts` | WebSocket abstraction with auto-reconnect |
| `src/lib/format.ts` | Number/currency formatting |
| `src/hooks/use-game-socket.ts` | WS connection → Zustand dispatch |
| `src/hooks/use-game-loop.ts` | requestAnimationFrame multiplier interpolation |
| `src/canvas/GameCanvas.tsx` | @pixi/react Stage wrapper |
| `src/canvas/scenes/CrashScene.tsx` | Main scene: graph + rocket position calc |
| `src/canvas/scenes/StarField.tsx` | Parallax scrolling stars |
| `src/canvas/components/MultiplierCurve.tsx` | Exponential curve drawn with Graphics |
| `src/canvas/utils/curve-math.ts` | Multiplier formula, viewport scaling |
| `src/rive/RocketRive.tsx` | Rive canvas, CSS positioned to track curve tip |
| `src/rive/use-rocket-rive.ts` | Load .riv, map game phase to state machine inputs |
| `src/components/hud/BetPanel.tsx` | Bet input, ½/2×/Max, auto-cashout |
| `src/components/hud/CashoutButton.tsx` | Phase-aware Place Bet / Cash Out button |
| `src/components/hud/MultiplierDisplay.tsx` | Big centered multiplier text |
| `src/components/hud/RoundCountdown.tsx` | Countdown overlay |
| `src/components/social/PlayerList.tsx` | Bot + player list with cashout highlights |
| `src/components/history/RoundHistory.tsx` | Crash point badges bar |
| `src/components/fairness/VerifyModal.tsx` | Hash verification UI |
| `src/App.tsx` | Root component, layout assembly |
| `src/main.tsx` | React entry |
| `src/index.css` | Tailwind v4 imports |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`
- Create: `packages/server/package.json`, `packages/server/tsconfig.json`
- Create: `apps/client/package.json`, `apps/client/tsconfig.json`, `apps/client/vite.config.mts`, `apps/client/index.html`
- Create: `apps/client/src/main.tsx`, `apps/client/src/App.tsx`, `apps/client/src/index.css`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/luizfroes/Documents/code/jaqpot/game-dev-test
git init
```

- [ ] **Step 2: Create root config files**

`package.json`:
```json
{
  "name": "crash-game",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "concurrently \"pnpm --filter @crash/server dev\" \"pnpm --filter @crash/client dev\"",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "tsc -b"
  },
  "devDependencies": {
    "concurrently": "^9.1.0",
    "typescript": "^5.8.3"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

`.gitignore`:
```
node_modules/
dist/
.superpowers/
*.tsbuildinfo
```

- [ ] **Step 3: Create shared package**

`packages/shared/package.json`:
```json
{
  "name": "@crash/shared",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "vitest": "^3.1.0"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

`packages/shared/src/index.ts`:
```typescript
export * from './game-state.js';
export * from './messages.js';
export * from './verification.js';
```

- [ ] **Step 4: Create server package**

`packages/server/package.json`:
```json
{
  "name": "@crash/server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@crash/shared": "workspace:*",
    "fastify": "^5.3.0",
    "@fastify/websocket": "^11.0.0",
    "@fastify/cors": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "tsx": "^4.19.0",
    "vitest": "^3.1.0"
  }
}
```

`packages/server/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create client app**

`apps/client/package.json`:
```json
{
  "name": "@crash/client",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@crash/shared": "workspace:*",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "pixi.js": "^8.9.0",
    "@pixi/react": "^8.0.0",
    "@rive-app/react-canvas": "^4.16.0",
    "zustand": "^5.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.5.0",
    "typescript": "^5.8.3",
    "vite": "^6.3.0",
    "vitest": "^3.1.0",
    "tailwindcss": "^4.1.0",
    "@tailwindcss/vite": "^4.1.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/jest-dom": "^6.6.0",
    "jsdom": "^26.1.0"
  }
}
```

`apps/client/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"],
  "references": [
    { "path": "../../packages/shared" }
  ]
}
```

`apps/client/vite.config.mts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'http://localhost:3001',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:3001',
      },
    },
  },
});
```

`apps/client/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Crash Game</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/client/src/index.css`:
```css
@import "tailwindcss";
```

`apps/client/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

`apps/client/src/App.tsx`:
```tsx
export function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <h1 className="text-2xl font-bold">Crash Game — Loading...</h1>
    </div>
  );
}
```

- [ ] **Step 6: Install dependencies and verify**

```bash
pnpm install
```

- [ ] **Step 7: Verify client starts**

```bash
cd apps/client && pnpm dev
# Expected: Vite dev server on http://localhost:5173, shows "Crash Game — Loading..."
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold pnpm monorepo with client, server, and shared packages"
```

---

## Task 2: Shared Types & Zod Schemas

**Files:**
- Create: `packages/shared/src/game-state.ts`
- Create: `packages/shared/src/messages.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create game state types**

`packages/shared/src/game-state.ts`:
```typescript
export enum GamePhase {
  WAITING = 'waiting',
  COUNTDOWN = 'countdown',
  FLYING = 'flying',
  CRASHED = 'crashed',
}

export interface BotPlayer {
  id: string;
  name: string;
  betAmount: number;
  cashedOutAt: number | null;
}

export interface RoundResult {
  roundId: string;
  crashPoint: number;
  hash: string;
  timestamp: number;
}
```

- [ ] **Step 2: Create WS message schemas**

`packages/shared/src/messages.ts`:
```typescript
import { z } from 'zod';
import { GamePhase } from './game-state.js';

// --- Server → Client ---

export const roundWaitingSchema = z.object({
  type: z.literal('round:waiting'),
  roundId: z.string(),
  nextHash: z.string(),
});

export const roundCountdownSchema = z.object({
  type: z.literal('round:countdown'),
  startsIn: z.number(),
});

export const roundStartSchema = z.object({
  type: z.literal('round:start'),
  roundId: z.string(),
  startedAt: z.number(),
});

export const roundTickSchema = z.object({
  type: z.literal('round:tick'),
  multiplier: z.number(),
  elapsed: z.number(),
});

export const roundCrashSchema = z.object({
  type: z.literal('round:crash'),
  crashPoint: z.number(),
  serverSeed: z.string(),
  hash: z.string(),
});

const botPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  betAmount: z.number(),
  cashedOutAt: z.number().nullable(),
});

export const botsUpdateSchema = z.object({
  type: z.literal('bots:update'),
  bots: z.array(botPlayerSchema),
});

export const botCashoutSchema = z.object({
  type: z.literal('bot:cashout'),
  botId: z.string(),
  at: z.number(),
});

export const playerBetAcceptedSchema = z.object({
  type: z.literal('player:bet_accepted'),
  balance: z.number(),
});

export const playerCashoutAcceptedSchema = z.object({
  type: z.literal('player:cashout_accepted'),
  winnings: z.number(),
  balance: z.number(),
  at: z.number(),
});

export const stateSyncSchema = z.object({
  type: z.literal('state:sync'),
  phase: z.nativeEnum(GamePhase),
  roundId: z.string().nullable(),
  multiplier: z.number(),
  elapsed: z.number(),
  bots: z.array(botPlayerSchema),
  playerBet: z.object({
    amount: z.number(),
    autoCashoutAt: z.number().nullable(),
  }).nullable(),
});

export const errorSchema = z.object({
  type: z.literal('error'),
  code: z.string(),
  message: z.string(),
});

export const serverMessageSchema = z.discriminatedUnion('type', [
  roundWaitingSchema,
  roundCountdownSchema,
  roundStartSchema,
  roundTickSchema,
  roundCrashSchema,
  botsUpdateSchema,
  botCashoutSchema,
  playerBetAcceptedSchema,
  playerCashoutAcceptedSchema,
  stateSyncSchema,
  errorSchema,
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;

// --- Client → Server ---

export const betPlaceSchema = z.object({
  type: z.literal('bet:place'),
  amount: z.number().positive(),
  autoCashoutAt: z.number().min(1.01).optional(),
});

export const betCashoutSchema = z.object({
  type: z.literal('bet:cashout'),
});

export const clientMessageSchema = z.discriminatedUnion('type', [
  betPlaceSchema,
  betCashoutSchema,
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;
```

- [ ] **Step 3: Create empty verification module**

`packages/shared/src/verification.ts` (browser-compatible, no Node.js crypto):
```typescript
// Browser-compatible SHA-256 using Web Crypto API
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Synchronous version for server-side (uses Node crypto if available, fallback to sync impl)
export function sha256Sync(input: string): string {
  // This will be implemented differently in server vs client
  // Server: use Node's crypto.createHash
  // Client: this function should not be called (use async sha256 instead)
  throw new Error('sha256Sync not available in browser — use async sha256()');
}

export async function verifyCrashPoint(hash: string, nextHash: string): Promise<boolean> {
  const computed = await sha256(hash);
  return computed === nextHash;
}
```

- [ ] **Step 4: Verify typecheck passes**

```bash
cd packages/shared && pnpm typecheck
```
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared types, Zod WS message schemas, and verification utility"
```

---

## Task 3: Provably Fair Algorithm (TDD)

**Files:**
- Create: `packages/server/src/engine/provably-fair.ts`
- Create: `packages/server/src/__tests__/provably-fair.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/server/src/__tests__/provably-fair.test.ts`:
```typescript
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
    // Hash with very high first 13 hex chars (close to 2^52)
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
      expect(chain[i]).toBe(sha256(chain[i - 1]));
    }
  });

  it('terminating hash is the last element', () => {
    const seed = 'another-seed';
    const chain = buildHashChain(seed, 10);
    expect(chain[chain.length - 1]).toBe(sha256(chain[chain.length - 2]));
  });
});

describe('ProvablyFairEngine', () => {
  it('plays rounds in reverse order from the hash chain', () => {
    const engine = new ProvablyFairEngine(10);
    const firstRound = engine.getNextRound();
    const secondRound = engine.getNextRound();

    // First round uses hash[N-1], so sha256(hash[N-1]) === hash[N] (terminating)
    // verificationHash for round 1 IS the terminating hash
    expect(firstRound.verificationHash).toBe(engine.terminatingHash);
    // sha256(round 2 hash) === round 1 hash
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/server && pnpm test
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement provably-fair module**

`packages/server/src/engine/provably-fair.ts`:
```typescript
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
  return Math.max(1, result);
}

interface RoundData {
  roundId: string;
  hash: string;           // The hash used to derive crash point (revealed after crash)
  verificationHash: string; // sha256(hash) — the one published BEFORE the round starts
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
    // Start from second-to-last (last is terminating, published)
    this.currentIndex = this.chain.length - 2;
  }

  getNextRound(): RoundData {
    if (this.currentIndex < 0) {
      throw new Error('Hash chain exhausted');
    }
    const hash = this.chain[this.currentIndex];
    // verificationHash = sha256(hash) = chain[currentIndex + 1]
    // This is what's published BEFORE the round, so players can't reverse it
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/server && pnpm test
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/engine/provably-fair.ts packages/server/src/__tests__/provably-fair.test.ts
git commit -m "feat: implement provably fair hash chain engine with tests"
```

---

## Task 4: Crash Engine (TDD)

**Files:**
- Create: `packages/server/src/engine/crash-engine.ts`
- Create: `packages/server/src/__tests__/crash-engine.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/server/src/__tests__/crash-engine.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CrashEngine } from '../engine/crash-engine.js';
import { GamePhase } from '@crash/shared';

describe('CrashEngine', () => {
  let engine: CrashEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new CrashEngine({ chainLength: 100 });
  });

  afterEach(() => {
    engine.stop();
    vi.useRealTimers();
  });

  it('starts in WAITING phase', () => {
    expect(engine.phase).toBe(GamePhase.WAITING);
  });

  it('transitions WAITING → COUNTDOWN after waiting period', () => {
    const onPhaseChange = vi.fn();
    engine.on('phaseChange', onPhaseChange);
    engine.start();

    vi.advanceTimersByTime(5000);
    expect(onPhaseChange).toHaveBeenCalledWith(GamePhase.COUNTDOWN);
  });

  it('transitions COUNTDOWN → FLYING after countdown period', () => {
    const phases: GamePhase[] = [];
    engine.on('phaseChange', (p: GamePhase) => phases.push(p));
    engine.start();

    vi.advanceTimersByTime(5000); // WAITING → COUNTDOWN
    vi.advanceTimersByTime(3000); // COUNTDOWN → FLYING
    expect(phases).toContain(GamePhase.FLYING);
  });

  it('emits tick events during FLYING phase', () => {
    const onTick = vi.fn();
    engine.on('tick', onTick);
    engine.start();

    vi.advanceTimersByTime(5000 + 3000); // Get to FLYING
    vi.advanceTimersByTime(500); // ~10 ticks at 50ms interval
    expect(onTick).toHaveBeenCalled();
    const lastCall = onTick.mock.calls[onTick.mock.calls.length - 1];
    expect(lastCall[0]).toHaveProperty('multiplier');
    expect(lastCall[0]).toHaveProperty('elapsed');
  });

  it('crashes when multiplier reaches crash point', () => {
    const onCrash = vi.fn();
    engine.on('crash', onCrash);
    engine.start();

    vi.advanceTimersByTime(5000 + 3000); // Get to FLYING
    // Advance enough time for any crash point to be reached
    vi.advanceTimersByTime(120_000);
    expect(onCrash).toHaveBeenCalled();
    expect(engine.phase).toBe(GamePhase.CRASHED);
  });

  it('provides round data including hash and crash point', () => {
    const onCrash = vi.fn();
    engine.on('crash', onCrash);
    engine.start();

    vi.advanceTimersByTime(5000 + 3000 + 120_000);
    const crashData = onCrash.mock.calls[0][0];
    expect(crashData).toHaveProperty('crashPoint');
    expect(crashData).toHaveProperty('hash');
    expect(crashData).toHaveProperty('serverSeed');
    expect(crashData.crashPoint).toBeGreaterThanOrEqual(1.0);
  });

  it('returns to WAITING after crash', () => {
    const phases: GamePhase[] = [];
    engine.on('phaseChange', (p: GamePhase) => phases.push(p));
    engine.start();

    vi.advanceTimersByTime(5000 + 3000 + 120_000); // Crash
    vi.advanceTimersByTime(3000); // Post-crash delay
    expect(phases[phases.length - 1]).toBe(GamePhase.WAITING);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/server && pnpm test src/__tests__/crash-engine.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement crash engine**

`packages/server/src/engine/crash-engine.ts`:
```typescript
import { EventEmitter } from 'events';
import { GamePhase } from '@crash/shared';
import { ProvablyFairEngine, getCrashPoint } from './provably-fair.js';

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
    this.fairEngine = new ProvablyFairEngine(
      options.chainLength ?? 10000,
      options.seed,
    );
  }

  get phase(): GamePhase {
    return this._phase;
  }

  get terminatingHash(): string {
    return this.fairEngine.terminatingHash;
  }

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
      nextHash: this.currentRound.verificationHash, // sha256(hash) — safe to publish, can't reverse to get crash point
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
    this.emit('roundStart', {
      roundId: this.currentRound.roundId,
      startedAt: this.roundStartedAt,
    });

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
      hash: this.currentRound.hash,           // The actual hash that derives the crash point
      serverSeed: this.currentRound.hash,       // Same as hash for this prototype (seed IS the hash)
      roundId: this.currentRound.roundId,
      // Verification: sha256(hash) === verificationHash (published before round)
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/server && pnpm test src/__tests__/crash-engine.test.ts
```
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/engine/crash-engine.ts packages/server/src/__tests__/crash-engine.test.ts
git commit -m "feat: implement crash engine with round lifecycle and event emission"
```

---

## Task 5: Bot Manager (TDD)

**Files:**
- Create: `packages/server/src/engine/bot-manager.ts`
- Create: `packages/server/src/__tests__/bot-manager.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/server/src/__tests__/bot-manager.test.ts`:
```typescript
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
      // null means the bot won't cash out (will bust)
      if (target !== null) {
        expect(target).toBeGreaterThanOrEqual(1.1);
      }
    }
  });

  it('returns bots that should cash out at a given multiplier', () => {
    const manager = new BotManager();
    manager.generateBots();
    const cashedOut = manager.processCashouts(5.0);
    // Some bots should have cashed out by 5x
    expect(Array.isArray(cashedOut)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/server && pnpm test src/__tests__/bot-manager.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement bot manager**

`packages/server/src/engine/bot-manager.ts`:
```typescript
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
    const count = 4 + Math.floor(Math.random() * 5); // 4-8
    const shuffled = [...BOT_NAMES].sort(() => Math.random() - 0.5);

    this.bots = [];
    this.cashoutTargets = {};
    this.cashedOutSet.clear();

    for (let i = 0; i < count; i++) {
      const id = `bot-${i}-${Date.now()}`;
      const betAmount = Math.round(
        Math.exp(Math.random() * Math.log(500 / 5) + Math.log(5))
      );

      const bot: BotPlayer = {
        id,
        name: shuffled[i % shuffled.length],
        betAmount: Math.max(5, Math.min(500, betAmount)),
        cashedOutAt: null,
      };

      this.bots.push(bot);

      // Assign cashout target
      const r = Math.random();
      if (r < 0.15) {
        // 15% never cash out (bust)
        this.cashoutTargets[id] = null;
      } else if (r < 0.45) {
        // 30% early cashout (1.1-2x)
        this.cashoutTargets[id] = 1.1 + Math.random() * 0.9;
      } else if (r < 0.75) {
        // 30% mid cashout (2-5x)
        this.cashoutTargets[id] = 2 + Math.random() * 3;
      } else {
        // 25% high cashout (5-20x)
        this.cashoutTargets[id] = 5 + Math.random() * 15;
      }
    }

    return [...this.bots];
  }

  getCashoutTargets(): Record<string, number | null> {
    return { ...this.cashoutTargets };
  }

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

  getBots(): BotPlayer[] {
    return [...this.bots];
  }

  reset(): void {
    this.bots = [];
    this.cashoutTargets = {};
    this.cashedOutSet.clear();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/server && pnpm test src/__tests__/bot-manager.test.ts
```
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/engine/bot-manager.ts packages/server/src/__tests__/bot-manager.test.ts
git commit -m "feat: implement bot manager with simulated player behavior"
```

---

## Task 6: Server WebSocket & HTTP Routes

**Files:**
- Create: `packages/server/src/ws/game-room.ts`
- Create: `packages/server/src/routes/history.ts`
- Create: `packages/server/src/routes/verify.ts`
- Create: `packages/server/src/index.ts`

- [ ] **Step 1: Implement game room**

`packages/server/src/ws/game-room.ts`:
```typescript
import { WebSocket } from 'ws';
import { GamePhase, type BotPlayer, type RoundResult, clientMessageSchema } from '@crash/shared';
import { CrashEngine, getMultiplier } from '../engine/crash-engine.js';
import { BotManager } from '../engine/bot-manager.js';

interface PlayerBet {
  ws: WebSocket;
  amount: number;
  autoCashoutAt: number | null;
  cashedOutAt: number | null;
}

export class GameRoom {
  private engine: CrashEngine;
  private botManager = new BotManager();
  private clients = new Set<WebSocket>();
  private playerBets = new Map<WebSocket, PlayerBet>();
  private roundHistory: RoundResult[] = [];
  private playerBalances = new Map<WebSocket, number>();

  constructor() {
    this.engine = new CrashEngine();
    this.setupEngineEvents();
  }

  private setupEngineEvents(): void {
    this.engine.on('roundWaiting', (data: { roundId: string; nextHash: string }) => {
      const bots = this.botManager.generateBots();
      this.broadcast({
        type: 'round:waiting',
        roundId: data.roundId,
        nextHash: data.nextHash,
      });
      this.broadcast({
        type: 'bots:update',
        bots,
      });
    });

    this.engine.on('countdown', (data: { startsIn: number }) => {
      this.broadcast({ type: 'round:countdown', startsIn: data.startsIn });
    });

    this.engine.on('roundStart', (data: { roundId: string; startedAt: number }) => {
      this.broadcast({ type: 'round:start', roundId: data.roundId, startedAt: data.startedAt });
    });

    this.engine.on('tick', (data: { multiplier: number; elapsed: number }) => {
      // Process bot cashouts
      const botCashouts = this.botManager.processCashouts(data.multiplier);
      for (const bot of botCashouts) {
        this.broadcast({ type: 'bot:cashout', botId: bot.id, at: bot.cashedOutAt! });
      }

      // Process auto-cashouts
      for (const [ws, bet] of this.playerBets) {
        if (bet.cashedOutAt !== null) continue;
        if (bet.autoCashoutAt !== null && data.multiplier >= bet.autoCashoutAt) {
          this.executeCashout(ws, bet, bet.autoCashoutAt);
        }
      }

      this.broadcast({ type: 'round:tick', multiplier: data.multiplier, elapsed: data.elapsed });
    });

    this.engine.on('crash', (data: { crashPoint: number; hash: string; serverSeed: string; roundId: string }) => {
      // Bust all remaining active bets
      for (const [, bet] of this.playerBets) {
        if (bet.cashedOutAt === null) {
          // Player lost
        }
      }
      this.playerBets.clear();

      this.roundHistory.push({
        roundId: data.roundId,
        crashPoint: data.crashPoint,
        hash: data.hash,
        timestamp: Date.now(),
      });
      if (this.roundHistory.length > 50) {
        this.roundHistory.shift();
      }

      this.broadcast({
        type: 'round:crash',
        crashPoint: data.crashPoint,
        serverSeed: data.serverSeed,
        hash: data.hash,
      });
    });
  }

  private executeCashout(ws: WebSocket, bet: PlayerBet, at: number): void {
    bet.cashedOutAt = at;
    const winnings = Math.round(bet.amount * at * 100) / 100;
    const currentBalance = this.playerBalances.get(ws) ?? 1000;
    const newBalance = currentBalance + winnings;
    this.playerBalances.set(ws, newBalance);
    this.send(ws, {
      type: 'player:cashout_accepted',
      winnings,
      balance: newBalance,
      at,
    });
  }

  addClient(ws: WebSocket): void {
    this.clients.add(ws);
    if (!this.playerBalances.has(ws)) {
      this.playerBalances.set(ws, 1000);
    }

    // Send current state
    this.send(ws, {
      type: 'state:sync',
      phase: this.engine.phase,
      roundId: this.engine.getCurrentRoundId(),
      multiplier: this.engine.getCurrentMultiplier(),
      elapsed: 0,
      bots: this.botManager.getBots(),
      playerBet: null,
    });

    // Send history
    if (this.roundHistory.length > 0) {
      for (const round of this.roundHistory) {
        // Client can reconstruct from state:sync + individual round data
      }
    }
  }

  removeClient(ws: WebSocket): void {
    this.clients.delete(ws);
    this.playerBets.delete(ws);
  }

  handleMessage(ws: WebSocket, raw: string): void {
    let msg;
    try {
      msg = clientMessageSchema.parse(JSON.parse(raw));
    } catch {
      this.send(ws, { type: 'error', code: 'INVALID_MESSAGE', message: 'Invalid message format' });
      return;
    }

    switch (msg.type) {
      case 'bet:place':
        this.handleBetPlace(ws, msg.amount, msg.autoCashoutAt ?? null);
        break;
      case 'bet:cashout':
        this.handleBetCashout(ws);
        break;
    }
  }

  private handleBetPlace(ws: WebSocket, amount: number, autoCashoutAt: number | null): void {
    if (this.engine.phase !== GamePhase.WAITING) {
      this.send(ws, { type: 'error', code: 'WRONG_PHASE', message: 'Bets only accepted during waiting phase' });
      return;
    }

    const balance = this.playerBalances.get(ws) ?? 1000;
    if (amount > balance) {
      this.send(ws, { type: 'error', code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance' });
      return;
    }

    if (this.playerBets.has(ws)) {
      this.send(ws, { type: 'error', code: 'ALREADY_BET', message: 'Already placed a bet this round' });
      return;
    }

    const newBalance = balance - amount;
    this.playerBalances.set(ws, newBalance);
    this.playerBets.set(ws, { ws, amount, autoCashoutAt, cashedOutAt: null });
    this.send(ws, { type: 'player:bet_accepted', balance: newBalance });
  }

  private handleBetCashout(ws: WebSocket): void {
    if (this.engine.phase !== GamePhase.FLYING) {
      this.send(ws, { type: 'error', code: 'WRONG_PHASE', message: 'Can only cash out during flying phase' });
      return;
    }

    const bet = this.playerBets.get(ws);
    if (!bet || bet.cashedOutAt !== null) {
      this.send(ws, { type: 'error', code: 'NO_ACTIVE_BET', message: 'No active bet to cash out' });
      return;
    }

    const currentMultiplier = this.engine.getCurrentMultiplier();
    this.executeCashout(ws, bet, Math.round(currentMultiplier * 100) / 100);
  }

  private broadcast(msg: object): void {
    const data = JSON.stringify(msg);
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  private send(ws: WebSocket, msg: object): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
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
```

- [ ] **Step 2: Implement routes**

`packages/server/src/routes/history.ts`:
```typescript
import { FastifyInstance } from 'fastify';
import { GameRoom } from '../ws/game-room.js';

export function historyRoute(fastify: FastifyInstance, room: GameRoom): void {
  fastify.get('/api/history', async () => {
    return { rounds: room.getHistory() };
  });
}
```

`packages/server/src/routes/verify.ts`:
```typescript
import { FastifyInstance } from 'fastify';
import { GameRoom } from '../ws/game-room.js';

export function verifyRoute(fastify: FastifyInstance, room: GameRoom): void {
  fastify.get<{ Params: { roundId: string } }>('/api/verify/:roundId', async (request) => {
    const { roundId } = request.params;
    const history = room.getHistory();
    const round = history.find(r => r.roundId === roundId);
    if (!round) {
      return { error: 'Round not found' };
    }
    return {
      round,
      terminatingHash: room.getTerminatingHash(),
    };
  });
}
```

- [ ] **Step 3: Implement server entry point**

`packages/server/src/index.ts`:
```typescript
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { GameRoom } from './ws/game-room.js';
import { historyRoute } from './routes/history.js';
import { verifyRoute } from './routes/verify.js';

const PORT = 3001;

async function main() {
  const fastify = Fastify({ logger: true });

  await fastify.register(fastifyCors, { origin: true });
  await fastify.register(fastifyWebsocket);

  const room = new GameRoom();

  fastify.get('/ws', { websocket: true }, (socket) => {
    room.addClient(socket);

    socket.on('message', (raw: Buffer) => {
      room.handleMessage(socket, raw.toString());
    });

    socket.on('close', () => {
      room.removeClient(socket);
    });
  });

  fastify.get('/api/health', async () => ({ status: 'ok' }));
  historyRoute(fastify, room);
  verifyRoute(fastify, room);

  room.start();

  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Crash game server running on port ${PORT}`);
}

main().catch(console.error);
```

- [ ] **Step 4: Verify server starts**

```bash
cd packages/server && pnpm dev
```
Expected: Server starts on port 3001, logs appear.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/
git commit -m "feat: implement server with WebSocket game room, history, and verify routes"
```

---

## Task 7: Zustand Stores

**Files:**
- Create: `apps/client/src/store/game-store.ts`
- Create: `apps/client/src/store/player-store.ts`
- Create: `apps/client/src/lib/format.ts`
- Create: `apps/client/src/__tests__/game-store.test.ts`

- [ ] **Step 1: Write failing store tests**

`apps/client/src/__tests__/game-store.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../store/game-store.js';
import { usePlayerStore } from '../store/player-store.js';
import { GamePhase } from '@crash/shared';

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('starts in WAITING phase', () => {
    expect(useGameStore.getState().phase).toBe(GamePhase.WAITING);
  });

  it('updates phase', () => {
    useGameStore.getState().setPhase(GamePhase.FLYING);
    expect(useGameStore.getState().phase).toBe(GamePhase.FLYING);
  });

  it('updates multiplier', () => {
    useGameStore.getState().setMultiplier(3.5);
    expect(useGameStore.getState().multiplier).toBe(3.5);
  });

  it('adds rounds to history (max 50)', () => {
    for (let i = 0; i < 55; i++) {
      useGameStore.getState().addRoundToHistory({
        roundId: `r-${i}`,
        crashPoint: 2.0,
        hash: `hash-${i}`,
        timestamp: Date.now(),
      });
    }
    expect(useGameStore.getState().roundHistory.length).toBe(50);
  });

  it('updates bot cashout', () => {
    useGameStore.getState().setBots([
      { id: 'b1', name: 'Bot1', betAmount: 10, cashedOutAt: null },
    ]);
    useGameStore.getState().updateBotCashout('b1', 2.5);
    expect(useGameStore.getState().bots[0].cashedOutAt).toBe(2.5);
  });
});

describe('playerStore', () => {
  beforeEach(() => {
    usePlayerStore.setState(usePlayerStore.getInitialState());
  });

  it('starts with $1000 balance', () => {
    expect(usePlayerStore.getState().balance).toBe(1000);
  });

  it('deducts bet amount', () => {
    usePlayerStore.getState().setBetAmount(50);
    usePlayerStore.getState().placeBet();
    expect(usePlayerStore.getState().hasActiveBet).toBe(true);
  });

  it('adds winnings on cashout', () => {
    usePlayerStore.getState().setBetAmount(100);
    usePlayerStore.getState().placeBet();
    usePlayerStore.getState().cashOut(2.5);
    expect(usePlayerStore.getState().cashedOutAt).toBe(2.5);
  });

  it('resets for new round', () => {
    usePlayerStore.getState().setBetAmount(100);
    usePlayerStore.getState().placeBet();
    usePlayerStore.getState().resetForNewRound();
    expect(usePlayerStore.getState().hasActiveBet).toBe(false);
    expect(usePlayerStore.getState().cashedOutAt).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/client && pnpm test src/__tests__/game-store.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement stores**

`apps/client/src/store/game-store.ts`:
```typescript
import { create } from 'zustand';
import { GamePhase, type BotPlayer, type RoundResult } from '@crash/shared';

interface GameState {
  phase: GamePhase;
  roundId: string | null;
  multiplier: number;
  crashPoint: number | null;
  serverSeed: string | null;
  roundStartedAt: number | null;
  bots: BotPlayer[];
  roundHistory: RoundResult[];
  connected: boolean;
  rocketPosition: { x: number; y: number };

  setPhase: (phase: GamePhase) => void;
  setMultiplier: (m: number) => void;
  setCrashPoint: (point: number, seed: string) => void;
  setBots: (bots: BotPlayer[]) => void;
  updateBotCashout: (botId: string, at: number) => void;
  addRoundToHistory: (result: RoundResult) => void;
  startRound: (roundId: string, startedAt: number) => void;
  setConnected: (c: boolean) => void;
  setRocketPosition: (x: number, y: number) => void;
  resetRound: () => void;
}

export const useGameStore = create<GameState>()((set) => ({
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

  setPhase: (phase) => set({ phase }),
  setMultiplier: (multiplier) => set({ multiplier }),
  setCrashPoint: (crashPoint, serverSeed) => set({ crashPoint, serverSeed }),
  setBots: (bots) => set({ bots }),
  updateBotCashout: (botId, at) =>
    set((state) => ({
      bots: state.bots.map((b) =>
        b.id === botId ? { ...b, cashedOutAt: at } : b
      ),
    })),
  addRoundToHistory: (result) =>
    set((state) => ({
      roundHistory: [...state.roundHistory, result].slice(-50),
    })),
  startRound: (roundId, roundStartedAt) =>
    set({ roundId, roundStartedAt, multiplier: 1.0, crashPoint: null, serverSeed: null }),
  setConnected: (connected) => set({ connected }),
  setRocketPosition: (x, y) => set({ rocketPosition: { x, y } }),
  resetRound: () =>
    set({
      multiplier: 1.0,
      crashPoint: null,
      serverSeed: null,
      roundStartedAt: null,
    }),
}));
```

`apps/client/src/store/player-store.ts`:
```typescript
import { create } from 'zustand';

interface PlayerState {
  balance: number;
  betAmount: number;
  autoCashoutAt: number | null;
  hasActiveBet: boolean;
  cashedOutAt: number | null;

  setBetAmount: (amount: number) => void;
  setAutoCashout: (at: number | null) => void;
  placeBet: () => void;
  cashOut: (at: number) => void;
  resetForNewRound: () => void;
  setBalance: (balance: number) => void;
}

export const usePlayerStore = create<PlayerState>()((set) => ({
  balance: 1000,
  betAmount: 10,
  autoCashoutAt: null,
  hasActiveBet: false,
  cashedOutAt: null,

  setBetAmount: (betAmount) => set({ betAmount }),
  setAutoCashout: (autoCashoutAt) => set({ autoCashoutAt }),
  placeBet: () => set({ hasActiveBet: true, cashedOutAt: null }),
  cashOut: (cashedOutAt) => set({ cashedOutAt, hasActiveBet: false }),
  resetForNewRound: () => set({ hasActiveBet: false, cashedOutAt: null }),
  setBalance: (balance) => set({ balance }),
}));
```

`apps/client/src/lib/format.ts`:
```typescript
export function formatMultiplier(value: number): string {
  return `${value.toFixed(2)}x`;
}

export function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/client && pnpm test src/__tests__/game-store.test.ts
```
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/store/ apps/client/src/lib/format.ts apps/client/src/__tests__/
git commit -m "feat: implement Zustand game and player stores with tests"
```

---

## Task 8: WebSocket Client & Game Loop Hooks

**Files:**
- Create: `apps/client/src/lib/ws-client.ts`
- Create: `apps/client/src/hooks/use-game-socket.ts`
- Create: `apps/client/src/hooks/use-game-loop.ts`

- [ ] **Step 1: Implement WebSocket client**

`apps/client/src/lib/ws-client.ts`:
```typescript
import { serverMessageSchema, type ServerMessage, type ClientMessage } from '@crash/shared';

type MessageHandler = (msg: ServerMessage) => void;

export class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('[WS] Connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const parsed = serverMessageSchema.parse(JSON.parse(event.data as string));
        for (const handler of this.handlers) {
          handler(parsed);
        }
      } catch (err) {
        console.warn('[WS] Invalid message:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('[WS] Disconnected, reconnecting in 2s...');
      this.reconnectTimer = setTimeout(() => this.connect(), 2000);
    };

    this.ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
```

- [ ] **Step 2: Implement WebSocket hook**

`apps/client/src/hooks/use-game-socket.ts`:
```typescript
import { useEffect, useRef } from 'react';
import { GamePhase, type ServerMessage, type ClientMessage } from '@crash/shared';
import { WsClient } from '../lib/ws-client.js';
import { useGameStore } from '../store/game-store.js';
import { usePlayerStore } from '../store/player-store.js';

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

export function useGameSocket() {
  const clientRef = useRef<WsClient | null>(null);

  useEffect(() => {
    const client = new WsClient(WS_URL);
    clientRef.current = client;

    const unsubscribe = client.onMessage((msg: ServerMessage) => {
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
        case 'round:crash':
          game.setPhase(GamePhase.CRASHED);
          game.setCrashPoint(msg.crashPoint, msg.serverSeed);
          game.addRoundToHistory({
            roundId: game.roundId ?? 'unknown',
            crashPoint: msg.crashPoint,
            hash: msg.hash,
            timestamp: Date.now(),
          });
          break;
        case 'bots:update':
          game.setBots(msg.bots);
          break;
        case 'bot:cashout':
          game.updateBotCashout(msg.botId, msg.at);
          break;
        case 'player:bet_accepted':
          player.placeBet();
          player.setBalance(msg.balance);
          break;
        case 'player:cashout_accepted':
          player.cashOut(msg.at);
          player.setBalance(msg.balance);
          break;
        case 'state:sync':
          game.setPhase(msg.phase);
          game.setMultiplier(msg.multiplier);
          game.setBots(msg.bots);
          if (msg.roundId) game.startRound(msg.roundId, Date.now() - msg.elapsed);
          game.setConnected(true);
          // Fetch round history via REST on connect/reconnect
          fetch('/api/history')
            .then(r => r.json())
            .then(data => {
              for (const round of data.rounds ?? []) {
                game.addRoundToHistory(round);
              }
            })
            .catch(() => {});
          break;
        case 'error':
          console.error(`[Game Error] ${msg.code}: ${msg.message}`);
          break;
      }
    });

    client.connect();
    // Note: connected state is set when state:sync is received from server

    return () => {
      unsubscribe();
      client.disconnect();
      useGameStore.getState().setConnected(false);
    };
  }, []);

  const send = (msg: ClientMessage) => {
    clientRef.current?.send(msg);
  };

  return { send };
}
```

- [ ] **Step 3: Implement game loop hook**

`apps/client/src/hooks/use-game-loop.ts`:
```typescript
import { useEffect, useRef } from 'react';
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../store/game-store.js';

const GROWTH_RATE = 0.00006;

export function useGameLoop() {
  const rafRef = useRef<number>(0);

  useEffect(() => {
    function tick() {
      const { phase, roundStartedAt, setMultiplier } = useGameStore.getState();

      if (phase === GamePhase.FLYING && roundStartedAt) {
        const elapsed = Date.now() - roundStartedAt;
        const multiplier = Math.pow(Math.E, elapsed * GROWTH_RATE);
        setMultiplier(multiplier);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/client/src/lib/ws-client.ts apps/client/src/hooks/
git commit -m "feat: implement WebSocket client, game socket hook, and game loop"
```

---

## Task 9: PixiJS Canvas — Curve Math & Scene

**Files:**
- Create: `apps/client/src/canvas/utils/curve-math.ts`
- Create: `apps/client/src/canvas/GameCanvas.tsx`
- Create: `apps/client/src/canvas/scenes/StarField.tsx`
- Create: `apps/client/src/canvas/scenes/CrashScene.tsx`
- Create: `apps/client/src/canvas/components/MultiplierCurve.tsx`

- [ ] **Step 1: Implement curve math**

`apps/client/src/canvas/utils/curve-math.ts`:
```typescript
const GROWTH_RATE = 0.00006;

export function getMultiplierAtTime(elapsedMs: number): number {
  return Math.pow(Math.E, elapsedMs * GROWTH_RATE);
}

export function getTimeAtMultiplier(multiplier: number): number {
  return Math.log(multiplier) / GROWTH_RATE;
}

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function calculateViewport(
  currentMultiplier: number,
  elapsedMs: number,
  canvasWidth: number,
  canvasHeight: number
): ViewportBounds {
  const padding = 1.3;
  return {
    minX: 0,
    maxX: elapsedMs * padding,
    minY: 0.8,
    maxY: Math.max(2, currentMultiplier * padding),
  };
}

export function worldToScreen(
  time: number,
  multiplier: number,
  viewport: ViewportBounds,
  canvasWidth: number,
  canvasHeight: number,
  margin = 60
): { x: number; y: number } {
  const plotWidth = canvasWidth - margin * 2;
  const plotHeight = canvasHeight - margin * 2;

  const x = margin + (time / viewport.maxX) * plotWidth;
  const y = canvasHeight - margin - ((multiplier - viewport.minY) / (viewport.maxY - viewport.minY)) * plotHeight;

  return { x, y };
}
```

- [ ] **Step 2: Implement StarField**

`apps/client/src/canvas/scenes/StarField.tsx`:
```tsx
import { useTick } from '@pixi/react';
import { useRef, useCallback } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../../store/game-store.js';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

export function StarField({ width, height }: { width: number; height: number }) {
  const starsRef = useRef<Star[]>([]);
  const graphicsRef = useRef<PixiGraphics>(null);

  if (starsRef.current.length === 0) {
    starsRef.current = Array.from({ length: 150 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.7 + 0.3,
    }));
  }

  useTick(() => {
    const phase = useGameStore.getState().phase;
    const g = graphicsRef.current;
    if (!g) return;

    g.clear();

    for (const star of starsRef.current) {
      if (phase === GamePhase.FLYING) {
        star.y += star.speed;
        if (star.y > height) {
          star.y = 0;
          star.x = Math.random() * width;
        }
      }

      g.circle(star.x, star.y, star.size);
      g.fill({ color: 0xffffff, alpha: star.alpha });
    }
  });

  const drawRef = useCallback((g: PixiGraphics | null) => {
    graphicsRef.current = g;
  }, []);

  return <pixiGraphics ref={drawRef} />;
}
```

- [ ] **Step 3: Implement MultiplierCurve**

`apps/client/src/canvas/components/MultiplierCurve.tsx`:
```tsx
import { useTick } from '@pixi/react';
import { useRef, useCallback } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../../store/game-store.js';
import {
  getMultiplierAtTime,
  calculateViewport,
  worldToScreen,
} from '../utils/curve-math.js';

interface CurveProps {
  width: number;
  height: number;
}

export function MultiplierCurve({ width, height }: CurveProps) {
  const graphicsRef = useRef<PixiGraphics>(null);

  useTick(() => {
    const g = graphicsRef.current;
    if (!g) return;

    const { phase, multiplier, roundStartedAt, setRocketPosition } = useGameStore.getState();
    g.clear();

    if (phase !== GamePhase.FLYING && phase !== GamePhase.CRASHED) return;
    if (!roundStartedAt) return;

    const elapsed = Date.now() - roundStartedAt;
    const viewport = calculateViewport(multiplier, elapsed, width, height);

    // Draw grid lines
    g.setStrokeStyle({ width: 1, color: 0x1f2937 });
    const ySteps = [1, 2, 3, 5, 10, 20, 50, 100].filter(v => v <= viewport.maxY);
    for (const yVal of ySteps) {
      const { y } = worldToScreen(0, yVal, viewport, width, height);
      if (y > 60 && y < height - 60) {
        g.moveTo(60, y);
        g.lineTo(width - 60, y);
        g.stroke();
      }
    }

    // Draw curve
    g.setStrokeStyle({ width: 3, color: 0x22d3ee });
    const steps = Math.min(500, Math.floor(elapsed / 20));
    let lastScreenPos = { x: 0, y: 0 };

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * elapsed;
      const m = getMultiplierAtTime(t);
      const pos = worldToScreen(t, m, viewport, width, height);

      if (i === 0) {
        g.moveTo(pos.x, pos.y);
      } else {
        g.lineTo(pos.x, pos.y);
      }
      lastScreenPos = pos;
    }
    g.stroke();

    // Glow effect
    g.setStrokeStyle({ width: 8, color: 0x22d3ee, alpha: 0.15 });
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * elapsed;
      const m = getMultiplierAtTime(t);
      const pos = worldToScreen(t, m, viewport, width, height);
      if (i === 0) g.moveTo(pos.x, pos.y);
      else g.lineTo(pos.x, pos.y);
    }
    g.stroke();

    // Update rocket position for Rive overlay
    setRocketPosition(lastScreenPos.x, lastScreenPos.y);
  });

  const drawRef = useCallback((g: PixiGraphics | null) => {
    graphicsRef.current = g;
  }, []);

  return <pixiGraphics ref={drawRef} />;
}
```

- [ ] **Step 4: Implement CrashScene and GameCanvas**

`apps/client/src/canvas/scenes/CrashScene.tsx`:
```tsx
import { Container } from '@pixi/react';
import { StarField } from './StarField.js';
import { MultiplierCurve } from '../components/MultiplierCurve.js';

interface CrashSceneProps {
  width: number;
  height: number;
}

export function CrashScene({ width, height }: CrashSceneProps) {
  return (
    <Container>
      <StarField width={width} height={height} />
      <MultiplierCurve width={width} height={height} />
    </Container>
  );
}
```

`apps/client/src/canvas/GameCanvas.tsx`:
```tsx
import { Application } from '@pixi/react';
import { CrashScene } from './scenes/CrashScene.js';

interface GameCanvasProps {
  width: number;
  height: number;
}

export function GameCanvas({ width, height }: GameCanvasProps) {
  return (
    <Application
      width={width}
      height={height}
      backgroundAlpha={0}
      antialias
      resizeTo={undefined}
    >
      <CrashScene width={width} height={height} />
    </Application>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/canvas/
git commit -m "feat: implement PixiJS canvas with star field and multiplier curve"
```

---

## Task 10: Rive Rocket Integration

**Files:**
- Create: `apps/client/src/rive/use-rocket-rive.ts`
- Create: `apps/client/src/rive/RocketRive.tsx`
- Download: community .riv file to `apps/client/public/assets/rocket.riv`

- [ ] **Step 1: Find and download a Rive community rocket asset**

Search the Rive community (https://rive.app/community) for a rocket or spaceship animation. Download the .riv file and place it at `apps/client/public/assets/rocket.riv`.

If no suitable community file is found, create a minimal placeholder. The hook will be wired up regardless.

- [ ] **Step 2: Implement Rive hook**

`apps/client/src/rive/use-rocket-rive.ts`:
```typescript
import { useEffect, useRef } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../store/game-store.js';

// Rive state machine states: 0=Idle, 1=Countdown, 2=Launch (transition), 3=Flying, 4=Explode
// Launch (2) is triggered briefly when transitioning to FLYING, then switches to 3
const PHASE_MAP: Record<GamePhase, number> = {
  [GamePhase.WAITING]: 0,
  [GamePhase.COUNTDOWN]: 1,
  [GamePhase.FLYING]: 3,   // Launch (2) is handled as a brief transition below
  [GamePhase.CRASHED]: 4,
};

export function useRocketRive() {
  const { rive, RiveComponent } = useRive({
    src: '/assets/rocket.riv',
    stateMachines: 'RocketSM',
    autoplay: true,
  });

  const phaseInput = useStateMachineInput(rive, 'RocketSM', 'phase');
  const speedInput = useStateMachineInput(rive, 'RocketSM', 'speed');

  const phase = useGameStore((s) => s.phase);
  const multiplier = useGameStore((s) => s.multiplier);

  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (!phaseInput) return;
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    // Trigger Launch (2) briefly when transitioning to FLYING
    if (phase === GamePhase.FLYING && prevPhase === GamePhase.COUNTDOWN) {
      phaseInput.value = 2; // Launch
      setTimeout(() => {
        phaseInput.value = 3; // Flying
      }, 500); // Brief launch burst, then steady flight
    } else {
      phaseInput.value = PHASE_MAP[phase] ?? 0;
    }
  }, [phase, phaseInput]);

  useEffect(() => {
    if (speedInput && phase === GamePhase.FLYING) {
      // Normalize speed: 0 at 1x, 1 at 10x+
      const normalized = Math.min(1, (multiplier - 1) / 9);
      speedInput.value = normalized;
    }
  }, [multiplier, phase, speedInput]);

  return { RiveComponent };
}
```

- [ ] **Step 3: Implement RocketRive component**

`apps/client/src/rive/RocketRive.tsx`:
```tsx
import { useGameStore } from '../store/game-store.js';
import { useRocketRive } from './use-rocket-rive.js';
import { GamePhase } from '@crash/shared';

export function RocketRive() {
  const { RiveComponent } = useRocketRive();
  const position = useGameStore((s) => s.rocketPosition);
  const phase = useGameStore((s) => s.phase);

  const isVisible = phase === GamePhase.FLYING || phase === GamePhase.CRASHED || phase === GamePhase.COUNTDOWN;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        width: 80,
        height: 80,
        transform: `translate(${position.x - 40}px, ${position.y - 60}px)`,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s',
      }}
    >
      <RiveComponent />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/client/src/rive/ apps/client/public/assets/
git commit -m "feat: integrate Rive rocket animation with game phase state machine"
```

---

## Task 11: React HUD Components

**Files:**
- Create: `apps/client/src/components/hud/BetPanel.tsx`
- Create: `apps/client/src/components/hud/CashoutButton.tsx`
- Create: `apps/client/src/components/hud/MultiplierDisplay.tsx`
- Create: `apps/client/src/components/hud/RoundCountdown.tsx`
- Create: `apps/client/src/components/social/PlayerList.tsx`
- Create: `apps/client/src/components/history/RoundHistory.tsx`
- Create: `apps/client/src/components/fairness/VerifyModal.tsx`

- [ ] **Step 1: Implement BetPanel + CashoutButton**

`apps/client/src/components/hud/CashoutButton.tsx`:
```tsx
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../../store/game-store.js';
import { usePlayerStore } from '../../store/player-store.js';
import { formatMultiplier, formatCurrency } from '../../lib/format.js';

interface CashoutButtonProps {
  onPlaceBet: () => void;
  onCashOut: () => void;
}

export function CashoutButton({ onPlaceBet, onCashOut }: CashoutButtonProps) {
  const phase = useGameStore((s) => s.phase);
  const multiplier = useGameStore((s) => s.multiplier);
  const { hasActiveBet, cashedOutAt, betAmount } = usePlayerStore();

  if (cashedOutAt !== null) {
    return (
      <button
        disabled
        className="w-full py-3 rounded-lg bg-green-600 text-white font-bold text-lg"
      >
        Won {formatCurrency(betAmount * cashedOutAt)} @ {formatMultiplier(cashedOutAt)}
      </button>
    );
  }

  if (phase === GamePhase.FLYING && hasActiveBet) {
    const potentialWin = betAmount * multiplier;
    return (
      <button
        onClick={onCashOut}
        className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 text-black font-bold text-lg animate-pulse hover:from-cyan-300 hover:to-cyan-400 transition-all"
      >
        CASH OUT @ {formatMultiplier(multiplier)}
        <div className="text-sm font-normal mt-0.5">
          Win: {formatCurrency(potentialWin)}
        </div>
      </button>
    );
  }

  if (phase === GamePhase.CRASHED && hasActiveBet) {
    return (
      <button
        disabled
        className="w-full py-3 rounded-lg bg-red-600 text-white font-bold text-lg"
      >
        BUSTED
      </button>
    );
  }

  const canBet = phase === GamePhase.WAITING && !hasActiveBet;

  return (
    <button
      onClick={onPlaceBet}
      disabled={!canBet}
      className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-400 hover:to-emerald-500 transition-all"
    >
      {hasActiveBet ? 'BET PLACED' : phase === GamePhase.WAITING ? 'PLACE BET' : 'WAITING...'}
    </button>
  );
}
```

`apps/client/src/components/hud/BetPanel.tsx`:
```tsx
import { usePlayerStore } from '../../store/player-store.js';
import { CashoutButton } from './CashoutButton.js';
import { formatCurrency } from '../../lib/format.js';

interface BetPanelProps {
  onPlaceBet: (amount: number, autoCashout: number | null) => void;
  onCashOut: () => void;
}

export function BetPanel({ onPlaceBet, onCashOut }: BetPanelProps) {
  const { balance, betAmount, autoCashoutAt, setBetAmount, setAutoCashout } = usePlayerStore();

  const handleBetChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setBetAmount(Math.min(num, balance));
    }
  };

  const handleAutoCashoutChange = (value: string) => {
    if (value === '') {
      setAutoCashout(null);
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 1.01) {
      setAutoCashout(num);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="flex justify-between mb-3">
        <span className="text-gray-400 text-sm">Balance</span>
        <span className="text-yellow-400 font-bold">{formatCurrency(balance)}</span>
      </div>

      <label className="text-gray-400 text-xs block mb-1">Bet Amount</label>
      <input
        type="number"
        value={betAmount}
        onChange={(e) => handleBetChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-md text-right text-sm mb-2"
        min={1}
        step={1}
      />

      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setBetAmount(Math.max(1, Math.floor(betAmount / 2)))}
          className="flex-1 bg-gray-800 border border-gray-700 text-gray-400 py-1 rounded text-xs hover:bg-gray-700"
        >
          ½
        </button>
        <button
          onClick={() => setBetAmount(Math.min(balance, betAmount * 2))}
          className="flex-1 bg-gray-800 border border-gray-700 text-gray-400 py-1 rounded text-xs hover:bg-gray-700"
        >
          2×
        </button>
        <button
          onClick={() => setBetAmount(balance)}
          className="flex-1 bg-gray-800 border border-gray-700 text-gray-400 py-1 rounded text-xs hover:bg-gray-700"
        >
          Max
        </button>
      </div>

      <label className="text-gray-400 text-xs block mb-1">Auto Cashout</label>
      <input
        type="number"
        value={autoCashoutAt ?? ''}
        onChange={(e) => handleAutoCashoutChange(e.target.value)}
        placeholder="e.g. 2.00"
        className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-md text-right text-sm mb-3"
        min={1.01}
        step={0.1}
      />

      <CashoutButton
        onPlaceBet={() => onPlaceBet(betAmount, autoCashoutAt)}
        onCashOut={onCashOut}
      />
    </div>
  );
}
```

- [ ] **Step 2: Implement MultiplierDisplay and RoundCountdown**

`apps/client/src/components/hud/MultiplierDisplay.tsx`:
```tsx
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../../store/game-store.js';
import { formatMultiplier } from '../../lib/format.js';

export function MultiplierDisplay() {
  const phase = useGameStore((s) => s.phase);
  const multiplier = useGameStore((s) => s.multiplier);
  const crashPoint = useGameStore((s) => s.crashPoint);

  if (phase === GamePhase.WAITING) return null;

  const isCrashed = phase === GamePhase.CRASHED;
  const displayValue = isCrashed && crashPoint ? crashPoint : multiplier;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className={`text-5xl font-black transition-colors ${
          isCrashed ? 'text-red-500' : 'text-cyan-400'
        }`}
        style={{
          textShadow: isCrashed
            ? '0 0 30px rgba(239, 68, 68, 0.5)'
            : '0 0 30px rgba(34, 211, 238, 0.5)',
        }}
      >
        {formatMultiplier(displayValue)}
      </div>
      {isCrashed && (
        <div className="absolute mt-20 text-red-400 text-lg font-bold">
          CRASHED
        </div>
      )}
    </div>
  );
}
```

`apps/client/src/components/hud/RoundCountdown.tsx`:
```tsx
import { useState, useEffect } from 'react';
import { GamePhase } from '@crash/shared';
import { useGameStore } from '../../store/game-store.js';

export function RoundCountdown() {
  const phase = useGameStore((s) => s.phase);
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (phase !== GamePhase.COUNTDOWN) {
      setCount(3);
      return;
    }

    const interval = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  if (phase === GamePhase.WAITING) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-2xl text-gray-400 font-bold">
          Place your bets...
        </div>
      </div>
    );
  }

  if (phase !== GamePhase.COUNTDOWN) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-6xl font-black text-yellow-400 animate-bounce">
        {count > 0 ? count : 'GO!'}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement PlayerList**

`apps/client/src/components/social/PlayerList.tsx`:
```tsx
import { useGameStore } from '../../store/game-store.js';
import { usePlayerStore } from '../../store/player-store.js';
import { formatCurrency, formatMultiplier } from '../../lib/format.js';

export function PlayerList() {
  const bots = useGameStore((s) => s.bots);
  const { betAmount, hasActiveBet, cashedOutAt } = usePlayerStore();

  return (
    <div className="bg-gray-900 rounded-lg p-3 border border-gray-800 flex-1 overflow-auto">
      <div className="flex justify-between text-gray-500 text-xs mb-2 px-1">
        <span>Player</span>
        <span>Bet</span>
        <span>Cashout</span>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        {/* Player row */}
        {hasActiveBet && (
          <div
            className={`flex justify-between px-2 py-1.5 rounded ${
              cashedOutAt ? 'bg-green-900/30' : ''
            }`}
          >
            <span className="text-yellow-400">You</span>
            <span className="text-gray-400">{formatCurrency(betAmount)}</span>
            <span className={cashedOutAt ? 'text-green-400 font-bold' : 'text-gray-600'}>
              {cashedOutAt ? formatMultiplier(cashedOutAt) : '—'}
            </span>
          </div>
        )}

        {/* Bot rows */}
        {bots.map((bot) => (
          <div
            key={bot.id}
            className={`flex justify-between px-2 py-1.5 rounded ${
              bot.cashedOutAt ? 'bg-green-900/20' : ''
            }`}
          >
            <span className="text-gray-300">{bot.name}</span>
            <span className="text-gray-500">{formatCurrency(bot.betAmount)}</span>
            <span className={bot.cashedOutAt ? 'text-green-400 font-bold' : 'text-gray-600'}>
              {bot.cashedOutAt ? formatMultiplier(bot.cashedOutAt) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement RoundHistory**

`apps/client/src/components/history/RoundHistory.tsx`:
```tsx
import { useGameStore } from '../../store/game-store.js';

function getBadgeColor(crashPoint: number): string {
  if (crashPoint >= 10) return 'bg-yellow-500 text-black';
  if (crashPoint >= 2) return 'bg-green-600 text-white';
  return 'bg-red-600 text-white';
}

export function RoundHistory() {
  const history = useGameStore((s) => s.roundHistory);

  return (
    <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-2 overflow-x-auto">
      <span className="text-gray-500 text-xs shrink-0">History:</span>
      {history
        .slice(-20)
        .reverse()
        .map((round) => (
          <span
            key={round.roundId}
            className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${getBadgeColor(round.crashPoint)}`}
          >
            {round.crashPoint.toFixed(2)}x
          </span>
        ))}
      {history.length === 0 && (
        <span className="text-gray-600 text-xs">No rounds yet</span>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Implement VerifyModal**

`apps/client/src/components/fairness/VerifyModal.tsx`:
```tsx
import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/game-store.js';
import { sha256 } from '@crash/shared';

export function VerifyModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const history = useGameStore((s) => s.roundHistory);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [computedHash, setComputedHash] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const round = selectedRound !== null ? history[selectedRound] : null;
  // The NEXT round in history (played before this one) has the hash that sha256(this.hash) should equal
  const nextRound = selectedRound !== null && selectedRound < history.length - 1
    ? history[selectedRound + 1]
    : null;

  useEffect(() => {
    if (!round) {
      setComputedHash(null);
      setIsVerified(null);
      return;
    }
    sha256(round.hash).then(hash => {
      setComputedHash(hash);
      setIsVerified(nextRound ? hash === nextRound.hash : null);
    });
  }, [round, nextRound]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg p-6 max-w-lg w-full mx-4 border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">Verify Fairness</h2>
        <p className="text-gray-400 text-sm mb-4">
          Each round's crash point is derived from a hash chain. You can verify that
          sha256(round_hash) equals the next round's hash.
        </p>

        <div className="max-h-60 overflow-auto mb-4">
          {history.map((r, i) => (
            <button
              key={r.roundId}
              onClick={() => setSelectedRound(i)}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-800 ${
                selectedRound === i ? 'bg-gray-800 border border-cyan-400' : ''
              }`}
            >
              <span className="text-gray-400">{r.roundId}</span>
              <span className="float-right text-cyan-400">{r.crashPoint.toFixed(2)}x</span>
            </button>
          ))}
        </div>

        {round && (
          <div className="bg-gray-800 rounded p-3 text-xs font-mono">
            <div className="mb-2">
              <span className="text-gray-400">Hash: </span>
              <span className="text-cyan-300 break-all">{round.hash}</span>
            </div>
            <div className="mb-2">
              <span className="text-gray-400">sha256(hash): </span>
              <span className="text-cyan-300 break-all">{computedHash ?? 'computing...'}</span>
            </div>
            {isVerified !== null && (
              <div className={isVerified ? 'text-green-400' : 'text-red-400'}>
                {isVerified ? 'Verified — hashes match' : 'Verification failed'}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/components/
git commit -m "feat: implement all React HUD components (bet panel, player list, history, fairness)"
```

---

## Task 12: App Assembly

**Files:**
- Modify: `apps/client/src/App.tsx`

- [ ] **Step 1: Wire everything together**

`apps/client/src/App.tsx`:
```tsx
import { useState, useRef, useEffect } from 'react';
import { GameCanvas } from './canvas/GameCanvas.js';
import { RocketRive } from './rive/RocketRive.js';
import { MultiplierDisplay } from './components/hud/MultiplierDisplay.js';
import { RoundCountdown } from './components/hud/RoundCountdown.js';
import { BetPanel } from './components/hud/BetPanel.js';
import { PlayerList } from './components/social/PlayerList.js';
import { RoundHistory } from './components/history/RoundHistory.js';
import { VerifyModal } from './components/fairness/VerifyModal.js';
import { useGameSocket } from './hooks/use-game-socket.js';
import { useGameLoop } from './hooks/use-game-loop.js';
import { useGameStore } from './store/game-store.js';

export function App() {
  const { send } = useGameSocket();
  useGameLoop();

  const [verifyOpen, setVerifyOpen] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });
  const connected = useGameStore((s) => s.connected);
  const roundId = useGameStore((s) => s.roundId);

  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setCanvasSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handlePlaceBet = (amount: number, autoCashout: number | null) => {
    send({ type: 'bet:place', amount, autoCashoutAt: autoCashout ?? undefined });
  };

  const handleCashOut = () => {
    send({ type: 'bet:cashout' });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <RoundHistory />

      <div className="flex flex-1 gap-4 p-4 min-h-0">
        {/* Game Canvas Area */}
        <div ref={canvasContainerRef} className="flex-1 relative bg-gray-900/50 rounded-lg overflow-hidden">
          <GameCanvas width={canvasSize.width} height={canvasSize.height} />
          <RocketRive />
          <MultiplierDisplay />
          <RoundCountdown />
        </div>

        {/* Right Sidebar */}
        <aside className="w-72 flex flex-col gap-3 shrink-0">
          <BetPanel onPlaceBet={handlePlaceBet} onCashOut={handleCashOut} />
          <PlayerList />
        </aside>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex justify-between items-center">
        <button
          onClick={() => setVerifyOpen(true)}
          className="bg-transparent border border-gray-700 text-gray-400 px-3 py-1 rounded text-xs hover:bg-gray-800"
        >
          Verify Fairness
        </button>
        <span className="text-gray-600 text-xs">
          {connected ? `Round ${roundId ?? '—'} • Provably Fair` : 'Connecting...'}
        </span>
      </div>

      <VerifyModal isOpen={verifyOpen} onClose={() => setVerifyOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 2: Verify everything compiles**

```bash
cd apps/client && pnpm typecheck
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/client/src/App.tsx
git commit -m "feat: assemble full game layout with canvas, HUD, and WebSocket integration"
```

---

## Task 13: Integration Testing & Verification

**Files:**
- All existing files

- [ ] **Step 1: Run all unit tests**

```bash
pnpm test
```
Expected: All tests pass.

- [ ] **Step 2: Start dev servers and verify manually**

```bash
pnpm dev
```

Open http://localhost:5173. Verify:
1. Game connects to WebSocket (check console for "[WS] Connected")
2. "Place your bets..." appears during waiting phase
3. Place a bet → button changes to "BET PLACED"
4. Countdown shows 3, 2, 1
5. Rocket launches, multiplier curve draws on canvas
6. Rive rocket animation plays (or placeholder appears)
7. Bot players appear in player list with cashouts
8. Cash out → winnings calculated, balance updates
9. Let it crash → "CRASHED" appears in red, "BUSTED" on button
10. Round history badges appear at top
11. Click "Verify Fairness" → modal opens with hash data

- [ ] **Step 3: Fix any issues found during manual testing**

Address any bugs, styling issues, or edge cases discovered.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: polish and integration fixes after manual testing"
```

---

## Verification Checklist

1. `pnpm install` — installs all workspace dependencies
2. `pnpm dev` — starts both server (3001) and client (5173)
3. `pnpm test` — all unit tests pass
4. `pnpm typecheck` — no TypeScript errors
5. Browser: full game loop works (bet → fly → cash out / crash)
6. Browser: bot players visible and cashing out
7. Browser: round history updating
8. Browser: verify fairness modal shows hash chain
9. Network tab: WebSocket messages flowing correctly
10. Canvas: 60fps, smooth curve animation
