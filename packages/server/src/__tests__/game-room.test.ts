import { describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { GameRoom } from '../ws/game-room.js';

class MockSocket {
  readyState: number = WebSocket.OPEN;
  sentMessages: string[] = [];
  closeCode: number | undefined;
  closeReason: string | undefined;

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closeCode = code;
    this.closeReason = reason;
    this.readyState = WebSocket.CLOSED;
  }
}

function getLastMessage(socket: MockSocket): unknown {
  const rawMessage = socket.sentMessages.at(-1);
  expect(rawMessage).toBeDefined();
  return JSON.parse(rawMessage!);
}

describe('GameRoom reconnect behavior', () => {
  it('restores active bet and balance when the same player reconnects', () => {
    const room = new GameRoom();
    const firstSocket = new MockSocket() as unknown as WebSocket;

    room.addClient(firstSocket, 'player-1');
    room.handleMessage(firstSocket, JSON.stringify({
      type: 'bet:place',
      amount: 125,
      autoCashoutAt: 2.5,
    }));

    room.removeClient(firstSocket);

    const secondSocket = new MockSocket() as unknown as WebSocket;
    room.addClient(secondSocket, 'player-1');

    expect(getLastMessage(secondSocket as unknown as MockSocket)).toEqual({
      type: 'state:sync',
      phase: 'waiting',
      roundId: null,
      multiplier: 1,
      elapsed: 0,
      balance: 875,
      bots: [],
      playerBet: {
        amount: 125,
        autoCashoutAt: 2.5,
      },
    });
  });
});
