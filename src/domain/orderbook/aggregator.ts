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

const PRICE_PRECISION = 4;

function roundPrice(price: number): number {
  return Math.round(price * 10 ** PRICE_PRECISION) / 10 ** PRICE_PRECISION;
}

function mergeLevels(levels: NormalizedPriceLevel[]): MergedPriceLevel[] {
  const grouped = new Map<number, VenueLiquidityContribution[]>();

  for (const level of levels) {
    const key = roundPrice(level.price);
    const existing = grouped.get(key);
    if (existing) {
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
  let bestAsk: Probability | null = null;
  for (const ask of mergedAsks) {
    if (bestBid === null || ask.price > bestBid) {
      bestAsk = ask.price;
      break;
    }
  }

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
