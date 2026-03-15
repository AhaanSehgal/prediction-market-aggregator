import { ConnectionState } from '@/domain/orderbook/types';

export interface WebSocketManagerConfig {
  url: string;
  onMessage: (data: unknown) => void;
  onStateChange: (state: ConnectionState) => void;
  protocols?: string[];
  heartbeatIntervalMs?: number;
  maxReconnectDelay?: number;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay: number;
  private heartbeatIntervalMs: number;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMessageAt = 0;
  private intentionalClose = false;
  private config: WebSocketManagerConfig;
  private onlineHandler: (() => void) | null = null;

  constructor(config: WebSocketManagerConfig) {
    this.config = config;
    this.maxReconnectDelay = config.maxReconnectDelay ?? 30_000;
    this.heartbeatIntervalMs = config.heartbeatIntervalMs ?? 15_000;
  }

  connect(): void {
    this.intentionalClose = false;
    this.cleanup();
    this.listenOnline();
    this.config.onStateChange({ status: 'connecting' });

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);
    } catch {
      this.config.onStateChange({ status: 'error', error: 'Failed to create WebSocket' });
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.lastMessageAt = Date.now();
      this.config.onStateChange({ status: 'connected', since: Date.now() });
      this.startHeartbeatCheck();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.lastMessageAt = Date.now();
      try {
        const data = JSON.parse(event.data as string);
        this.config.onMessage(data);
      } catch {
      }
    };

    this.ws.onerror = () => {};

    this.ws.onclose = (event: CloseEvent) => {
      this.stopHeartbeatCheck();

      if (this.intentionalClose) {
        this.config.onStateChange({ status: 'disconnected', reason: 'Manual disconnect' });
        return;
      }

      const reason = event.reason || `Code ${event.code}`;
      const delay = this.getReconnectDelay();
      this.config.onStateChange({
        status: 'error',
        error: `Connection closed: ${reason}`,
        retryIn: delay,
      });
      this.scheduleReconnect();
    };
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.cleanup();
    this.removeOnlineListener();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.config.onStateChange({ status: 'disconnected', reason: 'Manual disconnect' });
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private getReconnectDelay(): number {
    const base = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    const jitter = Math.random() * 1000;
    return base + jitter;
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    const delay = this.getReconnectDelay();
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeatCheck(): void {
    this.stopHeartbeatCheck();
    this.heartbeatTimer = setInterval(() => {
      const staleDuration = Date.now() - this.lastMessageAt;
      if (staleDuration > this.heartbeatIntervalMs * 2) {
        this.ws?.close(4000, 'Stale connection');
      }
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeatCheck(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private listenOnline(): void {
    this.removeOnlineListener();
    this.onlineHandler = () => {
      if (this.intentionalClose) return;
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      this.connect();
    };
    window.addEventListener('online', this.onlineHandler);
  }

  private removeOnlineListener(): void {
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
  }

  private cleanup(): void {
    this.stopHeartbeatCheck();
    this.clearReconnectTimer();
  }
}
