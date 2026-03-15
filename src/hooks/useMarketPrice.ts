'use client';

import { useOrderBookStore } from '@/stores/orderbook-store';

/**
 * Returns the aggregated YES price from the merged order book midpoint.
 * This reflects combined liquidity from all venues (Polymarket + Kalshi).
 * Returns a probability (0-1) or null while loading.
 */
export function useMarketPrice(): number | null {
  const midpoint = useOrderBookStore((s) => s.mergedBook.midpoint);
  return midpoint;
}
