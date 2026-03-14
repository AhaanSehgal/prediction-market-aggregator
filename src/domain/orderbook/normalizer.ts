import {
  NormalizedOrderBook,
  NormalizedPriceLevel,
  asProbability,
  asDollars,
} from './types';

// ─── Raw Polymarket types ───────────────────────────────────────
interface PolymarketBookEntry {
  price: string;
  size: string;
}

export interface PolymarketBookSnapshot {
  bids: PolymarketBookEntry[];
  asks: PolymarketBookEntry[];
  timestamp?: string;
}

// ─── Raw Kalshi types ───────────────────────────────────────────
// Kalshi API returns [price_string, quantity_string] tuples in dollars (0.01-0.99)
export interface KalshiBookSnapshot {
  yes_dollars: [string, string][];
  no_dollars: [string, string][];
}

// ─── Polymarket Normalizer ──────────────────────────────────────
// Polymarket prices are 0–1 (probability), sizes in USDC
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

// ─── Kalshi Normalizer ──────────────────────────────────────────
// Kalshi `orderbook_fp` returns dollar amounts, not contract counts.
// Convert dollars → shares: shares = dollars / price_per_contract.
export function normalizeKalshiBook(
  raw: KalshiBookSnapshot,
  timestamp?: number
): NormalizedOrderBook {
  // yes_dollars = YES bids: price is the probability directly
  // Quantity is in dollars → shares = dollars / yes_price
  const bids: NormalizedPriceLevel[] = (raw.yes_dollars || [])
    .map(([priceStr, dollarStr]) => {
      const price = parseFloat(priceStr);
      const dollars = parseFloat(dollarStr);
      return {
        price: asProbability(price),
        size: asDollars(price > 0 ? dollars / price : 0),
        venue: 'kalshi' as const,
      };
    })
    .filter((level) => level.size > 0 && level.price > 0 && level.price < 1)
    .sort((a, b) => b.price - a.price);

  // no_dollars = NO bids → YES asks at (1 - no_price)
  // Quantity is in dollars → shares = dollars / no_price
  const asks: NormalizedPriceLevel[] = (raw.no_dollars || [])
    .map(([priceStr, dollarStr]) => {
      const noPrice = parseFloat(priceStr);
      const dollars = parseFloat(dollarStr);
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
