import {
  NormalizedOrderBook,
} from '@/domain/orderbook/types';
import {
  normalizeKalshiBook,
  KalshiBookSnapshot,
} from '@/domain/orderbook/normalizer';

const KALSHI_BASE_URL = 'https://api.elections.kalshi.com/trade-api/v2';

/**
 * Fetches the real Kalshi order book for a given market ticker.
 * Uses the public elections API (no auth required).
 */
export async function fetchKalshiBook(
  ticker: string
): Promise<NormalizedOrderBook> {
  const response = await fetch(`${KALSHI_BASE_URL}/markets/${ticker}/orderbook`);

  if (!response.ok) {
    throw new Error(`Kalshi API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const raw: KalshiBookSnapshot = data.orderbook_fp || data.orderbook || data;

  return normalizeKalshiBook(raw);
}
