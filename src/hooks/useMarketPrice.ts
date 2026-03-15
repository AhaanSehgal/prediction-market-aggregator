'use client';

import { useOrderBookStore } from '@/stores/orderbook-store';

export function useMarketPrice(): number | null {
  const midpoint = useOrderBookStore((s) => s.mergedBook.midpoint);
  return midpoint;
}
