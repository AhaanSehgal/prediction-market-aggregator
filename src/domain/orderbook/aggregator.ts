import {
  NormalizedOrderBook,
  NormalizedPriceLevel,
  MergedOrderBook,
  MergedPriceLevel,
  VenueLiquidityContribution,
  Probability,
  Dollars,
  asProbability,
  asDollars,
} from './types';

const PRICE_PRECISION = 4; // Round to 4 decimal places for grouping

function roundPrice(price: number): number {
  return Math.round(price * 10 ** PRICE_PRECISION) / 10 ** PRICE_PRECISION;
}

/**
 * Groups price levels by rounded price, summing sizes and tracking venue contributions.
 */
function mergeLevels(levels: NormalizedPriceLevel[]): MergedPriceLevel[] {
  const grouped = new Map<number, VenueLiquidityContribution[]>();

  for (const level of levels) {
    const key = roundPrice(level.price);
    const existing = grouped.get(key);
    if (existing) {
      // Check if venue already has an entry at this level
      const venueEntry = existing.find((v) => v.venue === level.venue);
      if (venueEntry) {
        venueEntry.size = asDollars(venueEntry.size + level.size);
      } else {
        existing.push({ venue: level.venue, size: level.size });
      }
    } else {
      grouped.set(key, [{ venue: level.venue, size: level.size }]);
    }
  }

  return Array.from(grouped.entries()).map(([price, venues]) => ({
    price: asProbability(price) as Probability,
    totalSize: asDollars(venues.reduce((sum, v) => sum + v.size, 0)) as Dollars,
    venues,
  }));
}

/**
 * Merges order books from multiple venues into a single aggregated book.
 * Pure function — no side effects.
 */
export function mergeOrderBooks(
  ...books: NormalizedOrderBook[]
): MergedOrderBook {
  const allBids: NormalizedPriceLevel[] = [];
  const allAsks: NormalizedPriceLevel[] = [];

  for (const book of books) {
    allBids.push(...book.bids);
    allAsks.push(...book.asks);
  }

  const mergedBids = mergeLevels(allBids).sort((a, b) => b.price - a.price);
  const mergedAsks = mergeLevels(allAsks).sort((a, b) => a.price - b.price);

  const bestBid = mergedBids.length > 0 ? mergedBids[0].price : null;
  const bestAsk = mergedAsks.length > 0 ? mergedAsks[0].price : null;

  let spread: number | null = null;
  let midpoint: Probability | null = null;

  if (bestBid !== null && bestAsk !== null) {
    spread = Math.round((bestAsk - bestBid) * 10000) / 10000;
    midpoint = asProbability((bestBid + bestAsk) / 2);
  }

  return {
    bids: mergedBids,
    asks: mergedAsks,
    bestBid,
    bestAsk,
    spread,
    midpoint,
  };
}

/**
 * Creates an empty merged order book.
 */
export function emptyMergedBook(): MergedOrderBook {
  return {
    bids: [],
    asks: [],
    bestBid: null,
    bestAsk: null,
    spread: null,
    midpoint: null,
  };
}
