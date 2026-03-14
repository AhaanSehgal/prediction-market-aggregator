// ─── Branded Types ───────────────────────────────────────────────
export type Probability = number & { readonly __brand: 'Probability' };
export type Dollars = number & { readonly __brand: 'Dollars' };

export function asProbability(n: number): Probability {
  return Math.max(0, Math.min(1, n)) as Probability;
}

export function asDollars(n: number): Dollars {
  return n as Dollars;
}

// ─── Venue ───────────────────────────────────────────────────────
export type VenueId = 'polymarket' | 'kalshi';

// ─── Price Level (single venue) ─────────────────────────────────
export interface NormalizedPriceLevel {
  price: Probability;
  size: Dollars;
  venue: VenueId;
}

// ─── Order Book (single venue, normalized) ──────────────────────
export interface NormalizedOrderBook {
  bids: NormalizedPriceLevel[]; // sorted descending by price
  asks: NormalizedPriceLevel[]; // sorted ascending by price
  timestamp: number;
  venue: VenueId;
}

// ─── Merged Price Level (aggregated across venues) ──────────────
export interface VenueLiquidityContribution {
  venue: VenueId;
  size: Dollars;
}

export interface MergedPriceLevel {
  price: Probability;
  totalSize: Dollars;
  venues: VenueLiquidityContribution[];
}

// ─── Merged Order Book ──────────────────────────────────────────
export interface MergedOrderBook {
  bids: MergedPriceLevel[]; // sorted descending by price
  asks: MergedPriceLevel[]; // sorted ascending by price
  bestBid: Probability | null;
  bestAsk: Probability | null;
  spread: number | null;
  midpoint: Probability | null;
}

// ─── Quote ──────────────────────────────────────────────────────
export type QuoteSide = 'buy' | 'sell';

export interface FillAtLevel {
  price: Probability;
  size: Dollars;       // shares filled at this level
  cost: Dollars;       // dollars spent at this level
  venue: VenueId;
}

export interface VenueFillSummary {
  venue: VenueId;
  totalShares: Dollars;
  totalCost: Dollars;
  averagePrice: Probability;
}

export interface QuoteResult {
  side: QuoteSide;
  requestedAmount: Dollars;
  totalShares: Dollars;
  totalCost: Dollars;
  averagePrice: Probability;
  fills: FillAtLevel[];
  venueSummaries: VenueFillSummary[];
  priceImpact: number;    // difference between first fill price and last fill price
  remainingAmount: Dollars; // unfilled amount if book is thin
}

// ─── Connection State ───────────────────────────────────────────
export type ConnectionState =
  | { status: 'connecting' }
  | { status: 'connected'; since: number }
  | { status: 'disconnected'; reason?: string }
  | { status: 'error'; error: string; retryIn?: number };

export interface VenueConnection {
  venue: VenueId;
  state: ConnectionState;
  lastMessageAt: number | null;
}
