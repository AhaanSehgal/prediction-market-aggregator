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

export function calculateQuote(
  orderBook: MergedOrderBook,
  amount: number,
  side: QuoteSide
): QuoteResult {
  if (amount <= 0) {
    return emptyQuote(side, asDollars(amount));
  }

  const levels: MergedPriceLevel[] =
    side === 'buy' ? orderBook.asks : orderBook.bids;

  const fills: FillAtLevel[] = [];
  let remaining = amount;
  let totalShares = 0;
  let totalCost = 0;

  for (const level of levels) {
    if (remaining <= 0) break;

    for (const venueContrib of level.venues) {
      if (remaining <= 0) break;

      if (side === 'buy') {
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
        const sharesAtLevel = Math.min(remaining, venueContrib.size);
        const dollarsAtLevel = sharesAtLevel * level.price;

        fills.push({
          price: level.price,
          size: asDollars(sharesAtLevel),
          cost: asDollars(dollarsAtLevel),
          venue: venueContrib.venue,
        });

        remaining -= sharesAtLevel;
        totalShares += sharesAtLevel;
        totalCost += dollarsAtLevel;
      }
    }
  }

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

  const priceImpact =
    fills.length >= 2
      ? Math.abs(fills[fills.length - 1].price - fills[0].price)
      : 0;

  const averagePrice =
    totalShares > 0 ? asProbability(totalCost / totalShares) : asProbability(0);

  return {
    side,
    requestedAmount: asDollars(amount),
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
