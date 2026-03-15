import {
  NormalizedOrderBook,
  NormalizedPriceLevel,
  asProbability,
  asDollars,
} from './types';

interface PolymarketBookEntry {
  price: string;
  size: string;
}

export interface PolymarketBookSnapshot {
  bids: PolymarketBookEntry[];
  asks: PolymarketBookEntry[];
  timestamp?: string;
}

export interface KalshiBookSnapshot {
  yes_dollars: [string, string][];
  no_dollars: [string, string][];
}

export function normalizePolymarketBook(
  raw: PolymarketBookSnapshot,
  timestamp?: number
): NormalizedOrderBook {
  const bids: NormalizedPriceLevel[] = raw.bids
    .map((entry) => ({
      price: asProbability(parseFloat(entry.price)),
      size: asDollars(parseFloat(entry.size)),
      venue: 'polymarket' as const,
    }))
    .filter((level) => level.size > 0)
    .sort((a, b) => b.price - a.price);

  const asks: NormalizedPriceLevel[] = raw.asks
    .map((entry) => ({
      price: asProbability(parseFloat(entry.price)),
      size: asDollars(parseFloat(entry.size)),
      venue: 'polymarket' as const,
    }))
    .filter((level) => level.size > 0)
    .sort((a, b) => a.price - b.price);

  return {
    bids,
    asks,
    timestamp: timestamp ?? Date.now(),
    venue: 'polymarket',
  };
}

export function normalizeKalshiBook(
  raw: KalshiBookSnapshot,
  timestamp?: number
): NormalizedOrderBook {
  const bids: NormalizedPriceLevel[] = (raw.yes_dollars || [])
    .map(([priceStr, centStr]) => {
      const price = parseFloat(priceStr);
      const dollars = parseFloat(centStr) / 100;
      return {
        price: asProbability(price),
        size: asDollars(price > 0 ? dollars / price : 0),
        venue: 'kalshi' as const,
      };
    })
    .filter((level) => level.size > 0 && level.price > 0 && level.price < 1)
    .sort((a, b) => b.price - a.price);

  const asks: NormalizedPriceLevel[] = (raw.no_dollars || [])
    .map(([priceStr, centStr]) => {
      const noPrice = parseFloat(priceStr);
      const dollars = parseFloat(centStr) / 100;
      return {
        price: asProbability(1 - noPrice),
        size: asDollars(noPrice > 0 ? dollars / noPrice : 0),
        venue: 'kalshi' as const,
      };
    })
    .filter((level) => level.size > 0 && level.price > 0 && level.price < 1)
    .sort((a, b) => a.price - b.price);

  return {
    bids,
    asks,
    timestamp: timestamp ?? Date.now(),
    venue: 'kalshi',
  };
}
