import {
  NormalizedOrderBook,
  ConnectionState,
} from '@/domain/orderbook/types';
import {
  normalizeKalshiBook,
  KalshiBookSnapshot,
} from '@/domain/orderbook/normalizer';

const KALSHI_BASE_URL = 'https://api.elections.kalshi.com/trade-api/v2';
const POLL_INTERVAL_MS = 3000; // Poll every 3 seconds

export interface KalshiSocketCallbacks {
  onBookUpdate: (book: NormalizedOrderBook) => void;
  onStateChange: (state: ConnectionState) => void;
}

/**
 * Kalshi "socket" that polls the public REST API for order book updates.
 *
 * Kalshi's WebSocket requires authentication, so we poll the public
 * elections API instead. This provides near-real-time updates every 3s.
 * Implements the same interface as a real WebSocket would for easy swapping.
 */
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

    // Initial fetch
    this.fetchBook();

    // Start polling
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
        `${KALSHI_BASE_URL}/markets/${this.ticker}/orderbook`
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
      console.warn(`Kalshi fetch error (${this.consecutiveErrors}):`, err);

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
