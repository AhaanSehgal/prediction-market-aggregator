import {
  NormalizedOrderBook,
  NormalizedPriceLevel,
  asProbability,
  asDollars,
} from '@/domain/orderbook/types';

/**
 * Mock Kalshi REST API for initial book snapshot.
 *
 * Kalshi's real API requires authentication for order book data.
 * This generates a realistic initial snapshot that matches the format
 * our KalshiSocket mock produces.
 *
 * To swap for real data: use https://trading-api.kalshi.com/trade-api/v2/
 * with proper API key authentication.
 */
export async function fetchKalshiBook(
  _ticker: string
): Promise<NormalizedOrderBook> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  const midpoint = 0.35;
  const spread = 0.02;
  const bestBid = midpoint - spread / 2;
  const bestAsk = midpoint + spread / 2;

  const bids: NormalizedPriceLevel[] = [];
  const asks: NormalizedPriceLevel[] = [];

  for (let i = 0; i < 12; i++) {
    const bidPrice = Math.round((bestBid - i * 0.01) * 100) / 100;
    const askPrice = Math.round((bestAsk + i * 0.01) * 100) / 100;

    if (bidPrice > 0) {
      bids.push({
        price: asProbability(bidPrice),
        size: asDollars(Math.round(80 + Math.random() * 250)),
        venue: 'kalshi',
      });
    }

    if (askPrice < 1) {
      asks.push({
        price: asProbability(askPrice),
        size: asDollars(Math.round(80 + Math.random() * 250)),
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
