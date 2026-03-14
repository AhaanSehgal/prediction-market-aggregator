import {
  MergedOrderBook,
  MergedPriceLevel,
  QuoteSide,
  QuoteResult,
  FillAtLevel,
  VenueFillSummary,
  VenueId,
  Probability,
  Dollars,
  asProbability,
  asDollars,
} from './types';

/**
 * Calculates a quote by walking the order book for a given dollar amount.
 *
 * For a BUY: walks the asks (lowest first), buying shares at each level.
 *   - At price P, spending D dollars buys D/P shares.
 *
 * For a SELL: walks the bids (highest first), selling shares at each level.
 *   - At price P, selling S shares yields S*P dollars.
 *
 * Pure function — no side effects.
 */
export function calculateQuote(
  orderBook: MergedOrderBook,
  dollarAmount: number,
  side: QuoteSide
): QuoteResult {
  if (dollarAmount <= 0) {
    return emptyQuote(side, asDollars(dollarAmount));
  }

  const levels: MergedPriceLevel[] =
    side === 'buy' ? orderBook.asks : orderBook.bids;

  const fills: FillAtLevel[] = [];
  let remaining = dollarAmount;
  let totalShares = 0;
  let totalCost = 0;

  for (const level of levels) {
    if (remaining <= 0) break;

    // Process each venue's liquidity at this price level
    for (const venueContrib of level.venues) {
      if (remaining <= 0) break;

      if (side === 'buy') {
        // Buying: spend dollars to get shares
        // At price P, each share costs P dollars
        // Available dollar value at this level = size * price
        // But size is in shares available, cost = size * price
        const maxCostAtLevel = venueContrib.size * level.price;
        const costAtLevel = Math.min(remaining, maxCostAtLevel);
        const sharesAtLevel = costAtLevel / level.price;

        fills.push({
          price: level.price,
          size: asDollars(sharesAtLevel),
          cost: asDollars(costAtLevel),
          venue: venueContrib.venue,
        });

        remaining -= costAtLevel;
        totalShares += sharesAtLevel;
        totalCost += costAtLevel;
      } else {
        // Selling: sell shares to get dollars
        // At price P, each share returns P dollars
        // We want to receive `remaining` dollars total
        // Shares needed = remaining / price
        const maxDollarsAtLevel = venueContrib.size * level.price;
        const dollarsAtLevel = Math.min(remaining, maxDollarsAtLevel);
        const sharesAtLevel = dollarsAtLevel / level.price;

        fills.push({
          price: level.price,
          size: asDollars(sharesAtLevel),
          cost: asDollars(dollarsAtLevel),
          venue: venueContrib.venue,
        });

        remaining -= dollarsAtLevel;
        totalShares += sharesAtLevel;
        totalCost += dollarsAtLevel;
      }
    }
  }

  // Calculate venue summaries
  const venueMap = new Map<VenueId, { shares: number; cost: number }>();
  for (const fill of fills) {
    const existing = venueMap.get(fill.venue) ?? { shares: 0, cost: 0 };
    existing.shares += fill.size;
    existing.cost += fill.cost;
    venueMap.set(fill.venue, existing);
  }

  const venueSummaries: VenueFillSummary[] = Array.from(venueMap.entries()).map(
    ([venue, data]) => ({
      venue,
      totalShares: asDollars(data.shares),
      totalCost: asDollars(data.cost),
      averagePrice: asProbability(data.shares > 0 ? data.cost / data.shares : 0),
    })
  );

  // Price impact: difference between first and last fill price
  const priceImpact =
    fills.length >= 2
      ? Math.abs(fills[fills.length - 1].price - fills[0].price)
      : 0;

  const averagePrice =
    totalShares > 0 ? asProbability(totalCost / totalShares) : asProbability(0);

  return {
    side,
    requestedAmount: asDollars(dollarAmount),
    totalShares: asDollars(totalShares),
    totalCost: asDollars(totalCost),
    averagePrice,
    fills,
    venueSummaries,
    priceImpact,
    remainingAmount: asDollars(remaining),
  };
}

function emptyQuote(side: QuoteSide, amount: Dollars): QuoteResult {
  return {
    side,
    requestedAmount: amount,
    totalShares: asDollars(0),
    totalCost: asDollars(0),
    averagePrice: asProbability(0),
    fills: [],
    venueSummaries: [],
    priceImpact: 0,
    remainingAmount: amount,
  };
}
