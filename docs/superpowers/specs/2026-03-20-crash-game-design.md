# Crash Game (Aviator-style) — Design Spec

## Overview

A provably fair Crash game with a rocket/space theme. A rocket launches, a multiplier rises exponentially, and the player must cash out before the rocket crashes. Features simulated multiplayer (bot players), hash-chain provable fairness, and a hybrid rendering approach: PixiJS for the graph/stars canvas, Rive for the rocket animation, React+Tailwind for the HUD.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Canvas rendering | PixiJS v8 + @pixi/react |
| Rocket animation | Rive (@rive-app/react-canvas) — CSS overlay on PixiJS canvas |
| UI / HUD | React 19 + Tailwind CSS v4 |
| State management | Zustand v5 |
| Server | Fastify v5 + @fastify/websocket |
| Shared types | Zod schemas in shared package |
| Build | Vite + TypeScript strict |
| Package manager | pnpm workspaces |
| Testing | Vitest + Testing Library |

## Project Structure

```
game-dev-test/
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── packages/
│   ├── server/           # Fastify game server
│   │   └── src/
│   │       ├── index.ts
│   │       ├── ws/game-room.ts
│   │       ├── engine/crash-engine.ts
│   │       ├── engine/provably-fair.ts
│   │       ├── engine/bot-manager.ts
│   │       └── routes/history.ts, verify.ts
│   └── shared/           # Shared types + Zod schemas
│       └── src/
│           ├── messages.ts
│           ├── game-state.ts
│           └── verification.ts
└── apps/
    └── client/           # React + PixiJS + Rive frontend
        └── src/
            ├── store/game-store.ts, player-store.ts
            ├── hooks/use-game-socket.ts, use-game-loop.ts
            ├── canvas/GameCanvas.tsx, CrashScene.tsx, StarField.tsx, MultiplierCurve.tsx
            ├── rive/RocketRive.tsx, use-rocket-rive.ts
            ├── components/hud/BetPanel.tsx, CashoutButton.tsx, MultiplierDisplay.tsx
            ├── components/social/PlayerList.tsx
            ├── components/history/RoundHistory.tsx
            └── components/fairness/VerifyModal.tsx
```

## Game Mechanics

### Round Lifecycle

```
WAITING (5s) → COUNTDOWN (3s) → FLYING (variable) → CRASHED → WAITING
```

1. **WAITING**: Server accepts bets. Bot players place random bets. Player can set bet amount and auto-cashout.
2. **COUNTDOWN**: Bets locked. 3-second countdown displayed. Rive rocket enters countdown animation.
3. **FLYING**: Multiplier rises exponentially: `multiplier = e^(elapsed_ms × 0.00006)`. Player can cash out at any time. Bots cash out at random intervals.
4. **CRASHED**: Server reveals crash point + server seed. Players who didn't cash out lose. Rive rocket explodes.

### Multiplier Curve

```typescript
function getMultiplier(elapsedMs: number): number {
  const GROWTH_RATE = 0.00006;
  return Math.pow(Math.E, elapsedMs * GROWTH_RATE);
}
// ~2x at 11.5s, ~5x at 26.8s, ~10x at 38.4s
```

Client interpolates at 60fps using requestAnimationFrame. Server sends authoritative ticks at 20Hz for sync correction.

## Provably Fair Algorithm

Hash chain approach (industry standard, based on Bustabit):

1. Server generates a random 256-bit server seed (the raw seed)
2. Creates hash chain of length N: `hash[0] = seed`, `hash[n] = sha256(hash[n-1])`
3. The **last** hash (`hash[N]`) is published as the terminating hash before any rounds are played
4. Rounds are played in **reverse**: round 1 uses `hash[N-1]`, round 2 uses `hash[N-2]`, etc.
5. Crash point derived from hash using BigInt for precision:

```typescript
function getCrashPoint(hash: string): number {
  // Use first 52 bits (13 hex chars) of the hash
  const h = BigInt('0x' + hash.slice(0, 13));
  // ~3% chance of instant crash (house edge)
  if (h % 33n === 0n) return 1.0;
  // Calculate with BigInt to avoid floating-point precision loss
  const e = 2n ** 52n;
  const result = Number((100n * e - h) / (e - h)) / 100;
  return Math.max(1, result); // Floor at 1.00x
}
// Note: maximum possible result is ~100x due to 52-bit precision
```

6. Verification: `sha256(hash[round]) === hash[round+1]`

**Simplification for prototype:** No client seed. In production, a client seed or public salt (e.g., Bitcoin block hash) should be incorporated to prevent selective chain revelation. Omitted here for scope.

## Rendering Architecture

### Hybrid Canvas Approach (CSS Overlay)

```
<div className="relative w-full h-full">
  <GameCanvas />           ← PixiJS: curve graph, star field, axis labels
  <RocketRive />           ← Rive: positioned via CSS transform, tracks curve tip
  <MultiplierDisplay />    ← React: centered multiplier text
  <RoundCountdown />       ← React: countdown overlay
</div>
```

- PixiJS renders the exponential curve, scrolling star background, and axis labels
- Rive rocket canvas is absolutely positioned, synced to the curve tip via Zustand
- React overlays handle text (multiplier, countdown, status messages)

### Rive State Machine

Artboard: "Rocket", State Machine: "RocketSM"

| State | Trigger | Description |
|-------|---------|-------------|
| Idle | phase=waiting | Rocket on pad, subtle glow |
| Countdown | phase=countdown | Thruster warming, vibration |
| Launch | phase→flying | Burst animation, plays once |
| Flying | phase=flying | Continuous thrust, `speed` input (0-1) controls flame |
| Explode | phase=crashed | Explosion, debris, plays once |

Inputs: `phase` (number), `speed` (number 0-1)

**Asset source:** Use a free rocket/spaceship .riv from the Rive community library. If no suitable community file has the required state machine states, create a simple one in the Rive editor or use a placeholder sprite with the Rive hook wired up and ready for the real asset.

## Data Flow

```
Server (CrashEngine + BotManager + ProvablyFair)
  ↓ WebSocket JSON messages
ws-client.ts → use-game-socket hook
  ↓ dispatches actions
Zustand Stores (gameStore + playerStore)
  ↓ subscribes        ↓ subscribes
React HUD           PixiJS Canvas + Rive Overlay
```

## WebSocket Messages

### Server → Client
- `round:waiting` — `{ roundId, nextHash }` — new round, accept bets
- `round:countdown` — `{ startsIn: number }` — bets locked, countdown started
- `round:start` — `{ roundId, startedAt: number }` — round timestamp for interpolation
- `round:tick` — `{ multiplier: number, elapsed: number }` — authoritative sync (20Hz)
- `round:crash` — `{ crashPoint, serverSeed, hash }` — round over, seed revealed
- `bots:update` — `{ bots: BotPlayer[] }` — bot player list with bets
- `bot:cashout` — `{ botId, at: number }` — individual bot cashout event
- `player:bet_accepted` — `{ balance: number }` — bet confirmed
- `player:cashout_accepted` — `{ winnings, balance, at: number }` — cashout confirmed
- `state:sync` — `{ phase, roundId, multiplier, elapsed, bots, playerBet? }` — full state for reconnection
- `error` — `{ code: string, message: string }` — validation/protocol errors

### Client → Server
- `bet:place` — `{ amount: number, autoCashoutAt?: number }` — auto-cashout sent with bet, executed server-side
- `bet:cashout` — `{}` — cash out at current multiplier

## Zustand Store Shape

### gameStore
- `phase`: GamePhase enum (waiting/countdown/flying/crashed)
- `roundId`, `multiplier`, `crashPoint`, `serverSeed`
- `roundStartedAt`: timestamp for client interpolation
- `bots`: BotPlayer[] (id, name, betAmount, cashedOutAt)
- `roundHistory`: RoundResult[] (last 50 rounds)
- `connected`: boolean
- `rocketPosition`: {x, y} — screen-space position for Rive overlay sync

### playerStore
- `balance`: number (starts at $1,000, resets on refresh)
- `betAmount`, `autoCashoutAt`
- `hasActiveBet`, `cashedOutAt`

## UI Components

### Layout (approved mockup)
- **Top**: Round history bar — colored badges (green ≥2x, red <2x, gold ≥10x)
- **Center**: PixiJS canvas with Rive rocket overlay + multiplier display
- **Right sidebar**: Bet panel (amount input, ½/2×/Max, auto-cashout, cashout button) + player list
- **Footer**: "Verify Fairness" button + round info

## Simulated Multiplayer

BotManager generates 4-8 bot players per round:
- Random names from a pool
- Bet amounts following a log-normal distribution ($5-$500)
- Cashout times: some early (1.1-2x), some mid (2-5x), some ride high (5x+), some never cash out

## Server Architecture

- **Fastify v5** with `@fastify/websocket` and `@fastify/cors`
- Port 3001 (client Vite proxies `/ws` and `/api/*`)
- REST: `GET /api/history`, `GET /api/verify/:roundId`
- Hash chain generated on startup, rounds played from chain

### Reconnection

When a WebSocket reconnects, the server sends a `state:sync` message with the full current round state (phase, multiplier, elapsed time, bot list, player's active bet if any). The player's active bet survives disconnection — the server tracks it by a unique player ID (generated client-side, stored in localStorage).

### Cashout Race Condition

The server determines the effective cashout multiplier at the time it processes the `bet:cashout` message, not the client-submitted value. If the crash has already occurred by the time the message is processed, the cashout is rejected. No grace period — server time is authoritative.

### Auto-Cashout

Auto-cashout is executed **server-side**. The client sends `autoCashoutAt` with the `bet:place` message. The server checks the auto-cashout threshold on each tick and executes it atomically, eliminating latency issues.

### Balance

Player starts with $1,000. Balance is ephemeral (resets on page refresh). No persistence layer for this prototype.

## Testing Strategy

Priority order:
1. `provably-fair.test.ts` — hash chain, crash point calculation, verification
2. `crash-engine.test.ts` — round lifecycle transitions, timing
3. `game-store.test.ts` — Zustand actions and state transitions
4. `BetPanel.test.tsx` — input validation, phase-dependent UI
5. Integration: mock WS → full round → verify store mutations

## Dependencies

### Client
react, react-dom (^19), pixi.js (@pixi/react ^8), @rive-app/react-canvas (^4), zustand (^5), tailwindcss (^4), zod (^3), vite, vitest

### Server
fastify (^5), @fastify/websocket, @fastify/cors, zod (^3), tsx, vitest
