# Senior Game Engineer — Technical Challenge

## Overview

This repository contains a **Crash game** (Aviator-style) built entirely with AI as a starting point. The codebase is functional but far from polished — the game runs, bets work, the multiplier curve draws, and the provably fair system verifies. That said, the code has rough edges, visual bugs, performance issues, and missing features that no AI could properly solve.

**Your job is to take this beyond what AI can do.**

We are not looking for someone who can prompt an AI to write code. We are looking for a game engineer who can look at a PixiJS canvas, a Rive animation, and a React HUD — and make them feel alive. Someone who understands frame budgets, draw calls, easing curves, and the difference between a game that "works" and a game people want to play.

## The Challenge

Take this codebase and make it yours. Improve it however you see fit. There are no specific tasks — we want to see your judgment, your taste, and your technical depth.

Here are areas where the current implementation falls short. Pick what matters most and show us what you can do:

### Visual Polish
- The multiplier curve is basic — no glow, no particles, no trail effect
- Star field is simplistic — no depth layers, no nebula, no parallax
- Crash explosion is nonexistent — the rocket just stops
- No screen shake, no impact effects, no juice
- The Rive rocket animation is barely integrated — it loads but doesn't respond meaningfully to game state
- Color palette and typography could be more dynamic (multiplier color shifts, pulsing effects)

### Performance
- The curve redraws every frame from scratch instead of using efficient rendering
- No object pooling for particles or visual effects
- React re-renders are not optimized — components subscribe to entire store slices
- No FPS monitoring or performance budgeting

### Game Feel
- No sound effects or audio feedback
- Bet placement has no haptic/visual feedback
- Cashout moment has no celebration effect
- Round transitions are abrupt — no smooth animations between phases
- The countdown is plain text instead of a dramatic sequence

### Architecture
- The Rive integration is minimal — the state machine inputs (`fire`, `rotation`) could drive much richer animation
- WebSocket reconnection doesn't restore active bets
- No loading states or error boundaries
- The game is desktop-only — mobile layout is broken

### Features (Optional)
- Chat system
- Bet history panel with statistics
- Auto-bet with configurable strategies
- Keyboard shortcuts (Space to bet, Enter to cashout)
- Multiple themes/skins

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Canvas | PixiJS 8 + @pixi/react |
| Animation | Rive (@rive-app/react-canvas) |
| UI | React 19 + Tailwind CSS 4 |
| State | Zustand 5 |
| Server | Fastify 5 + WebSocket |
| Validation | Zod |
| Build | Vite + TypeScript (strict) |
| Testing | Vitest |

## Project Structure

```
├── apps/client/          # React + PixiJS + Rive frontend
│   └── src/
│       ├── canvas/       # PixiJS rendering (curve, stars)
│       ├── rive/         # Rive rocket integration
│       ├── components/   # React HUD (betting, players, history)
│       ├── store/        # Zustand stores
│       ├── hooks/        # WebSocket + game loop
│       └── lib/          # Utilities
├── packages/server/      # Fastify game server
│   └── src/
│       ├── engine/       # Crash engine, provably fair, bots
│       ├── ws/           # WebSocket game room
│       └── routes/       # REST endpoints
└── packages/shared/      # Shared types + Zod schemas
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start both server and client
pnpm dev

# Run tests
pnpm test
```

The server runs on port 3001, the client on port 5173 (with Vite proxy for `/ws` and `/api`).

## Evaluation Criteria

We will evaluate your submission on:

1. **Game feel** — Does it feel like a real game? Is there juice, polish, and attention to detail?
2. **Technical depth** — Do you understand PixiJS rendering, Rive state machines, and WebSocket state management at a deep level?
3. **Performance** — Does it run at 60fps? Are you conscious of draw calls, memory, and re-renders?
4. **Code quality** — Is the code clean, well-structured, and maintainable?
5. **Taste** — Did you make good decisions about what to improve and what to leave?

We care more about depth than breadth. A beautifully polished curve animation with particles and screen shake is worth more than five half-finished features.

## Rules

- **Time limit**: You have **3 days** from receiving this challenge to deliver your submission.
- **Delivery**: Create a **private GitHub repository** and grant access to **@thelfroes** and **@remi-jaqpot**.
- **Commit history**: We will review your commit history. Commit often and write meaningful messages.
- **AI usage**: You may use AI tools to assist you, but we will be looking for work that demonstrates understanding beyond what AI can generate. Copy-pasting AI output without understanding it will be obvious.
- **Questions**: If something is unclear, make a reasonable assumption and document it. Do not email us with questions about the challenge — problem-solving under ambiguity is part of what we are evaluating.

Good luck.
