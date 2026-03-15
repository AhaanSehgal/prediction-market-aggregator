import { NormalizedOrderBook } from '@/domain/orderbook/types';
import {
  normalizePolymarketBook,
  PolymarketBookSnapshot,
} from '@/domain/orderbook/normalizer';

import { POLYMARKET_CLOB } from '@/lib/api-urls';

export async function fetchPolymarketBook(
  tokenId: string
): Promise<NormalizedOrderBook> {
  const response = await fetch(`${POLYMARKET_CLOB}/book?token_id=${tokenId}`);

  if (!response.ok) {
    throw new Error(
      `Polymarket API error: ${response.status} ${response.statusText}`
    );
  }

  const data: PolymarketBookSnapshot = await response.json();
  return normalizePolymarketBook(data, Date.now());
}

export async function fetchPolymarketMidpoint(
  tokenId: string
): Promise<number | null> {
  try {
    const response = await fetch(
      `${POLYMARKET_CLOB}/midpoint?token_id=${tokenId}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.mid ? parseFloat(data.mid) : null;
  } catch {
    return null;
  }
}
