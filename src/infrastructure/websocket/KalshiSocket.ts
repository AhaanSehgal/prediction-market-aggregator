import {
  NormalizedOrderBook,
  NormalizedPriceLevel,
  ConnectionState,
  asProbability,
  asDollars,
} from '@/domain/orderbook/types';

export interface KalshiSocketCallbacks {
  onBookUpdate: (book: NormalizedOrderBook) => void;
  onStateChange: (state: ConnectionState) => void;
}

/**
 * Mock Kalshi WebSocket that simulates realistic order book data.
 *
 * Kalshi's real WebSocket requires authentication and has rate limits
 * that make it impractical for a take-home demo. This mock:
 * - Generates realistic order book data centered around a configurable midpoint
 * - Simulates price drift with a random walk
 * - Simulates connection drops and reconnections
 * - Implements the same interface a real KalshiSocket would use
 *
 * To swap for real data: implement the same KalshiSocketCallbacks interface
 * using WebSocketManager with wss://api.elections.kalshi.com/trade-api/ws/v2
 */
export class KalshiSocket {
  private callbacks: KalshiSocketCallbacks;
  private ticker: string;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private midpoint = 0.35; // Starting midpoint for JD Vance market
  private connected = false;

  constructor(ticker: string, callbacks: KalshiSocketCallbacks) {
    this.ticker = ticker;
    this.callbacks = callbacks;
  }

  connect(): void {
    this.callbacks.onStateChange({ status: 'connecting' });

    // Simulate connection delay
    setTimeout(() => {
      this.connected = true;
      this.callbacks.onStateChange({ status: 'connected', since: Date.now() });

      // Send initial snapshot
      this.emitBook();

      // Send updates every 2-5 seconds
      this.updateInterval = setInterval(() => {
        this.driftMidpoint();
        this.emitBook();
      }, 2000 + Math.random() * 3000);

      // Simulate occasional connection drops
      this.scheduleRandomDrop();
    }, 500 + Math.random() * 500);
  }

  disconnect(): void {
    this.connected = false;
    this.stopUpdates();
    this.callbacks.onStateChange({ status: 'disconnected', reason: 'Manual disconnect' });
  }

  private stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private driftMidpoint(): void {
    // Random walk: ±0.5-2% per update
    const drift = (Math.random() - 0.5) * 0.02;
    this.midpoint = Math.max(0.05, Math.min(0.95, this.midpoint + drift));
  }

  private emitBook(): void {
    if (!this.connected) return;

    const book = this.generateBook();
    this.callbacks.onBookUpdate(book);
  }

  private generateBook(): NormalizedOrderBook {
    const bids: NormalizedPriceLevel[] = [];
    const asks: NormalizedPriceLevel[] = [];

    // Generate 8-15 levels on each side
    const numLevels = 8 + Math.floor(Math.random() * 8);
    const spread = 0.01 + Math.random() * 0.02; // 1-3% spread

    const bestBid = this.midpoint - spread / 2;
    const bestAsk = this.midpoint + spread / 2;

    for (let i = 0; i < numLevels; i++) {
      // Kalshi prices are in cents, round to nearest cent
      const bidPrice = Math.round((bestBid - i * 0.01) * 100) / 100;
      const askPrice = Math.round((bestAsk + i * 0.01) * 100) / 100;

      if (bidPrice > 0 && bidPrice < 1) {
        // Liquidity tends to be larger near the top of book
        const sizeFactor = Math.max(0.5, 1 - i * 0.08);
        const baseSize = 50 + Math.random() * 200;
        bids.push({
          price: asProbability(bidPrice),
          size: asDollars(Math.round(baseSize * sizeFactor)),
          venue: 'kalshi',
        });
      }

      if (askPrice > 0 && askPrice < 1) {
        const sizeFactor = Math.max(0.5, 1 - i * 0.08);
        const baseSize = 50 + Math.random() * 200;
        asks.push({
          price: asProbability(askPrice),
          size: asDollars(Math.round(baseSize * sizeFactor)),
          venue: 'kalshi',
        });
      }
    }

    return {
      bids: bids.sort((a, b) => b.price - a.price),
      asks: asks.sort((a, b) => a.price - b.price),
      timestamp: Date.now(),
      venue: 'kalshi',
    };
  }

  private scheduleRandomDrop(): void {
    // 5% chance of a brief disconnect every 30-60s
    const checkInterval = setTimeout(() => {
      if (!this.connected) return;

      if (Math.random() < 0.05) {
        this.stopUpdates();
        this.callbacks.onStateChange({
          status: 'error',
          error: 'Simulated connection drop',
          retryIn: 3000,
        });

        setTimeout(() => {
          if (this.connected) {
            this.callbacks.onStateChange({ status: 'connected', since: Date.now() });
            this.emitBook();
            this.updateInterval = setInterval(() => {
              this.driftMidpoint();
              this.emitBook();
            }, 2000 + Math.random() * 3000);
          }
        }, 2000 + Math.random() * 2000);
      }

      this.scheduleRandomDrop();
    }, 30_000 + Math.random() * 30_000);

    // Clean up if disconnected
    if (!this.connected) {
      clearTimeout(checkInterval);
    }
  }
}
