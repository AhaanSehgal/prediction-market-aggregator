import { WebSocketManager } from './WebSocketManager';
import {
  NormalizedOrderBook,
  ConnectionState,
} from '@/domain/orderbook/types';
import {
  normalizePolymarketBook,
  PolymarketBookSnapshot,
} from '@/domain/orderbook/normalizer';

const POLYMARKET_WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

export interface PolymarketSocketCallbacks {
  onBookUpdate: (book: NormalizedOrderBook) => void;
  onStateChange: (state: ConnectionState) => void;
}

/**
 * Polymarket-specific WebSocket connection.
 * Subscribes to a specific token's order book channel and normalizes incoming data.
 */
export class PolymarketSocket {
  private manager: WebSocketManager;
  private tokenId: string;
  private callbacks: PolymarketSocketCallbacks;
  private subscribed = false;

  constructor(tokenId: string, callbacks: PolymarketSocketCallbacks) {
    this.tokenId = tokenId;
    this.callbacks = callbacks;

    this.manager = new WebSocketManager({
      url: POLYMARKET_WS_URL,
      onMessage: this.handleMessage.bind(this),
      onStateChange: (state) => {
        this.callbacks.onStateChange(state);
        // Re-subscribe on reconnect
        if (state.status === 'connected' && !this.subscribed) {
          this.subscribe();
        }
      },
      heartbeatIntervalMs: 60_000, // Polymarket can be slow between updates; REST polls fill gaps
    });
  }

  connect(): void {
    this.subscribed = false;
    this.manager.connect();
  }

  disconnect(): void {
    this.subscribed = false;
    this.manager.disconnect();
  }

  private subscribe(): void {
    this.manager.send({
      type: 'market',
      assets_ids: [this.tokenId],
    });
    this.subscribed = true;
  }

  private handleMessage(data: unknown): void {
    // Polymarket sends different message types
    const msg = data as Record<string, unknown>;

    // Handle book snapshot or update
    if (msg && typeof msg === 'object') {
      // The WS sends updates that look like book snapshots with bids/asks arrays
      const bookData = this.extractBookData(msg);
      if (bookData) {
        const normalized = normalizePolymarketBook(bookData);
        this.callbacks.onBookUpdate(normalized);
      }
    }
  }

  private extractBookData(msg: Record<string, unknown>): PolymarketBookSnapshot | null {
    // Polymarket WS can send different formats:
    // 1. Direct book: { bids: [...], asks: [...] }
    // 2. Wrapped: { market: TOKEN_ID, ... book data }
    // 3. Array of events

    if (Array.isArray(msg)) {
      // Process last event in batch
      for (let i = (msg as Record<string, unknown>[]).length - 1; i >= 0; i--) {
        const result = this.extractBookData((msg as Record<string, unknown>[])[i]);
        if (result) return result;
      }
      return null;
    }

    if ('bids' in msg && 'asks' in msg) {
      return {
        bids: (msg.bids as Array<{ price: string; size: string }>) || [],
        asks: (msg.asks as Array<{ price: string; size: string }>) || [],
      };
    }

    // Some messages contain nested book data
    if ('book' in msg && msg.book && typeof msg.book === 'object') {
      return this.extractBookData(msg.book as Record<string, unknown>);
    }

    return null;
  }
}
