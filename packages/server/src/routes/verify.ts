import type { FastifyInstance } from 'fastify';
import type { GameRoom } from '../ws/game-room.js';

export function registerVerifyRoute(app: FastifyInstance, gameRoom: GameRoom): void {
  app.get<{ Params: { roundId: string } }>('/api/verify/:roundId', async (request, reply) => {
    const { roundId } = request.params;
    const history = gameRoom.getHistory();
    const round = history.find((r) => r.roundId === roundId);

    if (!round) {
      reply.status(404).send({ error: 'Round not found' });
      return;
    }

    reply.send({
      round,
      terminatingHash: gameRoom.getTerminatingHash(),
    });
  });
}
