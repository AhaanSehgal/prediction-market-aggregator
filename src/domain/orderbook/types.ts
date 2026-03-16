export type Probability = number & { readonly __brand: 'Probability' };
export type Dollars = number & { readonly __brand: 'Dollars' };

export function asProbability(n: number): Probability {
  return Math.max(0, Math.min(1, n)) as Probability;
}

export function asDollars(n: number): Dollars {
  return n as Dollars;
}

export type VenueId = 'polymarket' | 'kalshi';

export interface NormalizedPriceLevel {
  price: Probability;
  size: Dollars;
  venue: VenueId;
}

export interface NormalizedOrderBook {
  bids: NormalizedPriceLevel[];
  asks: NormalizedPriceLevel[];
  timestamp: number;
  venue: VenueId;
}

export interface VenueLiquidityContribution {
  venue: VenueId;
  size: Dollars;
}

export interface MergedPriceLevel {
  price: Probability;
  totalSize: Dollars;
  venues: VenueLiquidityContribution[];
}

export interface MergedOrderBook {
  bids: MergedPriceLevel[];
  asks: MergedPriceLevel[];
  bestBid: Probability | null;
  bestAsk: Probability | null;
  spread: number | null;
  midpoint: Probability | null;
}

export type QuoteSide = 'buy' | 'sell';

export interface FillAtLevel {
  price: Probability;
  size: Dollars;
  cost: Dollars;
  fee: Dollars;
  effectivePrice: Probability;
  venue: VenueId;
}

export interface VenueFillSummary {
  venue: VenueId;
  totalShares: Dollars;
  totalCost: Dollars;
  totalFees: Dollars;
  averagePrice: Probability;
  effectiveAveragePrice: Probability;
}

export interface QuoteResult {
  side: QuoteSide;
  requestedAmount: Dollars;
  totalShares: Dollars;
  totalCost: Dollars;
  totalFees: Dollars;
  averagePrice: Probability;
  effectiveAveragePrice: Probability;
  fills: FillAtLevel[];
  venueSummaries: VenueFillSummary[];
  priceImpact: number;
  remainingAmount: Dollars;
}

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
