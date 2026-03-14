import { NormalizedOrderBook } from '@/domain/orderbook/types';
import {
  normalizePolymarketBook,
  PolymarketBookSnapshot,
} from '@/domain/orderbook/normalizer';

const CLOB_BASE_URL = 'https://clob.polymarket.com';

/**
 * Fetches the initial order book snapshot from Polymarket's REST API.
 * No authentication required for public order book data.
 */
export async function fetchPolymarketBook(
  tokenId: string
): Promise<NormalizedOrderBook> {
  const response = await fetch(`${CLOB_BASE_URL}/book?token_id=${tokenId}`);

  if (!response.ok) {
    throw new Error(
      `Polymarket API error: ${response.status} ${response.statusText}`
    );
  }

  const data: PolymarketBookSnapshot = await response.json();
  return normalizePolymarketBook(data, Date.now());
}

/**
 * Fetches midpoint price for a token from Polymarket.
 */
export async function fetchPolymarketMidpoint(
  tokenId: string
): Promise<number | null> {
  try {
    const response = await fetch(
      `${CLOB_BASE_URL}/midpoint?token_id=${tokenId}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.mid ? parseFloat(data.mid) : null;
  } catch {
    return null;
  }
}
