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
interface KalshiBookEntry {
  price: number;  // cents (1-99)
  quantity: number;
}

export interface KalshiBookSnapshot {
  yes: KalshiBookEntry[];
  no: KalshiBookEntry[];
  timestamp?: string;
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
// Kalshi prices are in cents (1–99). We normalize to 0–1.
// Kalshi quantities are number of contracts; each contract is $1 notional.
export function normalizeKalshiBook(
  raw: KalshiBookSnapshot,
  timestamp?: number
): NormalizedOrderBook {
  // Kalshi 'yes' bids at price X cents = bid at X/100 probability
  const bids: NormalizedPriceLevel[] = raw.yes
    .map((entry) => ({
      price: asProbability(entry.price / 100),
      size: asDollars(entry.quantity),
      venue: 'kalshi' as const,
    }))
    .filter((level) => level.size > 0)
    .sort((a, b) => b.price - a.price);

  // Kalshi 'no' offers are effectively 'yes' asks
  // A 'no' bid at price X cents means someone will sell 'yes' at (100-X) cents
  const asks: NormalizedPriceLevel[] = raw.no
    .map((entry) => ({
      price: asProbability((100 - entry.price) / 100),
      size: asDollars(entry.quantity),
      venue: 'kalshi' as const,
    }))
    .filter((level) => level.size > 0)
    .sort((a, b) => a.price - b.price);

  return {
    bids,
    asks,
    timestamp: timestamp ?? Date.now(),
    venue: 'kalshi',
  };
}
