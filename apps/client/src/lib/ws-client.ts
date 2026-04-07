import { serverMessageSchema, type ServerMessage } from '@crash/shared';

type MessageHandler = (msg: ServerMessage) => void;

const RECONNECT_DELAY_MS = 2000;

export class WsClient {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
  private url: string;
  private shouldReconnect = false;
  private onConnectionStateChange?: (connected: boolean) => void;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    this.shouldReconnect = true;
    this.openConnection();
  }

  private openConnection(): void {
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.onConnectionStateChange?.(true);
    });

    ws.addEventListener('message', (event: MessageEvent) => {
      let raw: unknown;
      try {
        raw = JSON.parse(event.data as string);
      } catch {
        console.warn('[WsClient] Failed to parse message', event.data);
        return;
      }

      const result = serverMessageSchema.safeParse(raw);
      if (!result.success) {
        console.warn('[WsClient] Unknown message shape', raw);
        return;
      }

      for (const handler of this.handlers) {
        handler(result.data);
      }
    });

    ws.addEventListener('close', () => {
      this.onConnectionStateChange?.(false);
      if (this.shouldReconnect) {
        setTimeout(() => {
          if (this.shouldReconnect) {
            this.openConnection();
          }
        }, RECONNECT_DELAY_MS);
      }
    });

    ws.addEventListener('error', (err) => {
      console.error('[WsClient] WebSocket error', err);
    });
  }

  send(data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WsClient] Cannot send: socket is not open');
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  onConnectionChange(handler: (connected: boolean) => void): () => void {
    this.onConnectionStateChange = handler;
    return () => {
      if (this.onConnectionStateChange === handler) {
        this.onConnectionStateChange = undefined;
      }
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
