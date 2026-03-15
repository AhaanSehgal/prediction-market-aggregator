import {
  MergedOrderBook,
  MergedPriceLevel,
  VenueLiquidityContribution,
  VenueId,
  asProbability,
  asDollars,
} from './types';

export function flipLevels(levels: MergedPriceLevel[]): MergedPriceLevel[] {
  return levels.map((l) => ({
    ...l,
    price: asProbability(1 - l.price),
    venues: l.venues.map((v) => ({ ...v })),
  }));
}

export type VenueFilter = 'all' | VenueId;

export function filterByVenue(
  levels: MergedPriceLevel[],
  venue: VenueFilter
): MergedPriceLevel[] {
  if (venue === 'all') return levels;
  return levels
    .map((l) => {
      const filtered = l.venues.filter((v) => v.venue === venue);
      if (filtered.length === 0) return null;
      return {
        ...l,
        totalSize: asDollars(filtered.reduce((sum, v) => sum + v.size, 0)),
        venues: filtered,
      };
    })
    .filter((l): l is MergedPriceLevel => l !== null);
}

export function groupByTick(
  levels: MergedPriceLevel[],
  tickCents: number,
  side: 'bid' | 'ask'
): MergedPriceLevel[] {
  if (tickCents <= 0.1) return levels;
  const tickDecimal = tickCents / 100;
  const grouped = new Map<number, MergedPriceLevel>();

  for (const level of levels) {
    const key =
      side === 'bid'
        ? Math.floor(level.price / tickDecimal) * tickDecimal
        : Math.ceil(level.price / tickDecimal) * tickDecimal;
    const rounded = Math.round(key * 10000) / 10000;

    const existing = grouped.get(rounded);
    if (existing) {
      const mergedVenues: VenueLiquidityContribution[] = [...existing.venues];
      for (const v of level.venues) {
        const ev = mergedVenues.find((mv) => mv.venue === v.venue);
        if (ev) ev.size = asDollars(ev.size + v.size);
        else mergedVenues.push({ ...v });
      }
      grouped.set(rounded, {
        price: asProbability(rounded),
        totalSize: asDollars(existing.totalSize + level.totalSize),
        venues: mergedVenues,
      });
    } else {
      grouped.set(rounded, {
        price: asProbability(rounded),
        totalSize: level.totalSize,
        venues: level.venues.map((v) => ({ ...v })),
      });
    }
  }

  const result = Array.from(grouped.values());
  return side === 'bid'
    ? result.sort((a, b) => b.price - a.price)
    : result.sort((a, b) => a.price - b.price);
}

export function uncrossBook(book: MergedOrderBook): MergedOrderBook {
  const MAX_DISTANCE = 0.15;
  const bestBid = book.bids.length > 0 ? book.bids[0].price : 0;
  const uncrossedAsks = book.asks.filter((l) => l.price > bestBid);
  const bestAsk = uncrossedAsks.length > 0 ? uncrossedAsks[0].price : null;

  const cleanAsks =
    bestAsk !== null
      ? uncrossedAsks.filter((l) => l.price <= bestAsk + MAX_DISTANCE)
      : uncrossedAsks;
  const cleanBids =
    bestBid > 0
      ? book.bids.filter((l) => l.price >= bestBid - MAX_DISTANCE)
      : book.bids;

  return {
    bids: cleanBids,
    asks: cleanAsks,
    bestBid: bestBid > 0 ? asProbability(bestBid) : null,
    bestAsk: bestAsk !== null ? asProbability(bestAsk) : null,
    spread:
      bestAsk !== null && bestBid > 0 ? bestAsk - bestBid : null,
    midpoint:
      bestAsk !== null && bestBid > 0
        ? asProbability((bestAsk + bestBid) / 2)
        : null,
  };
}

export function flipBook(book: MergedOrderBook): MergedOrderBook {
  const clean = uncrossBook(book);

  const flippedBids = flipLevels(clean.asks).sort(
    (a, b) => b.price - a.price
  );
  const flippedAsks = flipLevels(clean.bids).sort(
    (a, b) => a.price - b.price
  );

  const bestBid = flippedBids.length > 0 ? flippedBids[0].price : null;
  const bestAsk = flippedAsks.length > 0 ? flippedAsks[0].price : null;

  return {
    bids: flippedBids,
    asks: flippedAsks,
    bestBid: bestBid !== null ? asProbability(bestBid) : null,
    bestAsk: bestAsk !== null ? asProbability(bestAsk) : null,
    spread:
      bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null,
    midpoint:
      bestBid !== null && bestAsk !== null
        ? asProbability((bestAsk + bestBid) / 2)
        : null,
  };
}

export function cumulativeFromEnd(levels: MergedPriceLevel[]): number[] {
  const cum = new Array<number>(levels.length);
  let total = 0;
  for (let i = levels.length - 1; i >= 0; i--) {
    total += levels[i].totalSize;
    cum[i] = total;
  }
  return cum;
}

export function cumulativeFromStart(levels: MergedPriceLevel[]): number[] {
  const cum = new Array<number>(levels.length);
  let total = 0;
  for (let i = 0; i < levels.length; i++) {
    total += levels[i].totalSize;
    cum[i] = total;
  }
  return cum;
}

export function cumulativeUsdFromEnd(levels: MergedPriceLevel[]): number[] {
  const cum = new Array<number>(levels.length);
  let total = 0;
  for (let i = levels.length - 1; i >= 0; i--) {
    total += levels[i].totalSize * levels[i].price;
    cum[i] = total;
  }
  return cum;
}

export function cumulativeUsdFromStart(levels: MergedPriceLevel[]): number[] {
  const cum = new Array<number>(levels.length);
  let total = 0;
  for (let i = 0; i < levels.length; i++) {
    total += levels[i].totalSize * levels[i].price;
    cum[i] = total;
  }
  return cum;
}

export function totalSize(levels: MergedPriceLevel[]): number {
  let total = 0;
  for (const l of levels) total += l.totalSize;
  return Math.max(total, 1);
}
