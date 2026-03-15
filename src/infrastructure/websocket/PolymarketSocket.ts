import { WebSocketManager } from './WebSocketManager';
import {
  NormalizedOrderBook,
  ConnectionState,
} from '@/domain/orderbook/types';
import {
  normalizePolymarketBook,
  PolymarketBookSnapshot,
} from '@/domain/orderbook/normalizer';

import { POLYMARKET_WS } from '@/lib/api-urls';

export interface PriceChangeData {
  price: number;
  bestBid: number;
  bestAsk: number;
  timestamp: number;
}

export interface PolymarketSocketCallbacks {
  onBookUpdate: (book: NormalizedOrderBook) => void;
  onStateChange: (state: ConnectionState) => void;
  onPriceChange?: (data: PriceChangeData) => void;
}

export class PolymarketSocket {
  private manager: WebSocketManager;
  private tokenId: string;
  private callbacks: PolymarketSocketCallbacks;
  private subscribed = false;

  constructor(tokenId: string, callbacks: PolymarketSocketCallbacks) {
    this.tokenId = tokenId;
    this.callbacks = callbacks;

    this.manager = new WebSocketManager({
      url: POLYMARKET_WS,
      onMessage: this.handleMessage.bind(this),
      onStateChange: (state) => {
        this.callbacks.onStateChange(state);
        if (state.status === 'connected' && !this.subscribed) {
          this.subscribe();
        }
      },
      heartbeatIntervalMs: 15_000,
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
    const msg = data as Record<string, unknown>;
    if (!msg || typeof msg !== 'object') return;

    if (msg.event_type === 'price_change' && this.callbacks.onPriceChange) {
      this.handlePriceChange(msg);
      return;
    }

    const bookData = this.extractBookData(msg);
    if (bookData) {
      const normalized = normalizePolymarketBook(bookData);
      this.callbacks.onBookUpdate(normalized);
    }
  }

  private handlePriceChange(msg: Record<string, unknown>): void {
    const changes = msg.price_changes as Array<Record<string, string>> | undefined;
    if (!changes) return;

    const match = changes.find((c) => c.asset_id === this.tokenId);
    if (!match) return;

    const bestBid = parseFloat(match.best_bid || '0');
    const bestAsk = parseFloat(match.best_ask || '0');
    const midpoint = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : parseFloat(match.price || '0');

    this.callbacks.onPriceChange!({
      price: midpoint,
      bestBid,
      bestAsk,
      timestamp: parseInt(msg.timestamp as string, 10) || Date.now(),
    });
  }

  private extractBookData(msg: Record<string, unknown>): PolymarketBookSnapshot | null {
    if (Array.isArray(msg)) {
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

    if ('book' in msg && msg.book && typeof msg.book === 'object') {
      return this.extractBookData(msg.book as Record<string, unknown>);
    }

    return null;
  }
}
