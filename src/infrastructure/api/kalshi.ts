import {
  NormalizedOrderBook,
} from '@/domain/orderbook/types';
import {
  normalizeKalshiBook,
  KalshiBookSnapshot,
} from '@/domain/orderbook/normalizer';

export async function fetchKalshiBook(
  ticker: string
): Promise<NormalizedOrderBook> {
  const response = await fetch(`/api/kalshi-orderbook?ticker=${encodeURIComponent(ticker)}`);

  if (!response.ok) {
    throw new Error(`Kalshi API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const raw: KalshiBookSnapshot = data.orderbook_fp || data.orderbook || data;

  return normalizeKalshiBook(raw);
}
