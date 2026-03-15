import {
  NormalizedOrderBook,
  ConnectionState,
} from '@/domain/orderbook/types';
import {
  normalizeKalshiBook,
  KalshiBookSnapshot,
} from '@/domain/orderbook/normalizer';

const POLL_INTERVAL_MS = 3000;

export interface KalshiSocketCallbacks {
  onBookUpdate: (book: NormalizedOrderBook) => void;
  onStateChange: (state: ConnectionState) => void;
}

export class KalshiSocket {
  private callbacks: KalshiSocketCallbacks;
  private ticker: string;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private connected = false;
  private consecutiveErrors = 0;

  constructor(ticker: string, callbacks: KalshiSocketCallbacks) {
    this.ticker = ticker;
    this.callbacks = callbacks;
  }

  connect(): void {
    this.callbacks.onStateChange({ status: 'connecting' });
    this.connected = true;
    this.fetchBook();
    this.pollInterval = setInterval(() => {
      if (this.connected) {
        this.fetchBook();
      }
    }, POLL_INTERVAL_MS);
  }

  disconnect(): void {
    this.connected = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.callbacks.onStateChange({ status: 'disconnected', reason: 'Manual disconnect' });
  }

  private async fetchBook(): Promise<void> {
    try {
      const response = await fetch(
        `/api/kalshi-orderbook?ticker=${encodeURIComponent(this.ticker)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const raw: KalshiBookSnapshot = data.orderbook_fp || data.orderbook || data;
      const normalized = normalizeKalshiBook(raw);

      this.consecutiveErrors = 0;
      this.callbacks.onStateChange({ status: 'connected', since: Date.now() });
      this.callbacks.onBookUpdate(normalized);
    } catch (err) {
      this.consecutiveErrors++;

      if (this.consecutiveErrors >= 3) {
        this.callbacks.onStateChange({
          status: 'error',
          error: `Failed to fetch Kalshi data: ${err}`,
          retryIn: POLL_INTERVAL_MS,
        });
      }
    }
  }
}
