import type { FastifyInstance } from 'fastify';
import type { GameRoom } from '../ws/game-room.js';

export function registerHistoryRoute(app: FastifyInstance, gameRoom: GameRoom): void {
  app.get('/api/history', async (_request, reply) => {
    reply.send(gameRoom.getHistory());
  });
}
