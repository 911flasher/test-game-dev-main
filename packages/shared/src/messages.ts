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
  balance: z.number(),
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
