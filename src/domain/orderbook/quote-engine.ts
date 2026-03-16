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
import { takerFeePerContract, effectiveBuyPrice, effectiveSellPrice } from './fees';

interface VenueOffer {
  price: number;
  size: number;
  venue: VenueId;
  effectivePrice: number;
}

function decomposeOffers(
  levels: MergedPriceLevel[],
  side: QuoteSide
): VenueOffer[] {
  const offers: VenueOffer[] = [];

  for (const level of levels) {
    for (const vc of level.venues) {
      if (vc.size <= 0) continue;
      const ep =
        side === 'buy'
          ? effectiveBuyPrice(vc.venue, level.price)
          : effectiveSellPrice(vc.venue, level.price);

      offers.push({
        price: level.price,
        size: vc.size,
        venue: vc.venue,
        effectivePrice: ep,
      });
    }
  }

  if (side === 'buy') {
    offers.sort((a, b) => a.effectivePrice - b.effectivePrice);
  } else {
    offers.sort((a, b) => b.effectivePrice - a.effectivePrice);
  }

  return offers;
}

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

  const offers = decomposeOffers(levels, side);

  const fills: FillAtLevel[] = [];
  let remaining = amount;
  let totalShares = 0;
  let totalCost = 0;
  let totalFees = 0;

  for (const offer of offers) {
    if (remaining <= 0) break;

    const feePerContract = takerFeePerContract(offer.venue, offer.price);

    if (side === 'buy') {
      const costPerShare = offer.price;
      const totalPerShare = costPerShare + feePerContract;
      const maxShares = offer.size;
      const maxSpend = maxShares * totalPerShare;
      const spend = Math.min(remaining, maxSpend);
      const sharesAtLevel = spend / totalPerShare;
      const rawCost = sharesAtLevel * costPerShare;
      const fee = sharesAtLevel * feePerContract;

      fills.push({
        price: asProbability(offer.price),
        size: asDollars(sharesAtLevel),
        cost: asDollars(rawCost),
        fee: asDollars(fee),
        effectivePrice: asProbability(offer.effectivePrice),
        venue: offer.venue,
      });

      remaining -= spend;
      totalShares += sharesAtLevel;
      totalCost += rawCost;
      totalFees += fee;
    } else {
      const sharesAtLevel = Math.min(remaining, offer.size);
      const rawProceeds = sharesAtLevel * offer.price;
      const fee = sharesAtLevel * feePerContract;

      fills.push({
        price: asProbability(offer.price),
        size: asDollars(sharesAtLevel),
        cost: asDollars(rawProceeds),
        fee: asDollars(fee),
        effectivePrice: asProbability(offer.effectivePrice),
        venue: offer.venue,
      });

      remaining -= sharesAtLevel;
      totalShares += sharesAtLevel;
      totalCost += rawProceeds;
      totalFees += fee;
    }
  }

  const venueMap = new Map<VenueId, { shares: number; cost: number; fees: number }>();
  for (const fill of fills) {
    const existing = venueMap.get(fill.venue) ?? { shares: 0, cost: 0, fees: 0 };
    existing.shares += fill.size;
    existing.cost += fill.cost;
    existing.fees += fill.fee;
    venueMap.set(fill.venue, existing);
  }

  const venueSummaries: VenueFillSummary[] = Array.from(venueMap.entries()).map(
    ([venue, data]) => {
      const avgPrice = data.shares > 0 ? data.cost / data.shares : 0;
      const effAvg = data.shares > 0 ? (data.cost + data.fees) / data.shares : 0;
      return {
        venue,
        totalShares: asDollars(data.shares),
        totalCost: asDollars(data.cost),
        totalFees: asDollars(data.fees),
        averagePrice: asProbability(avgPrice),
        effectiveAveragePrice: asProbability(effAvg),
      };
    }
  );

  const priceImpact =
    fills.length >= 2
      ? Math.abs(fills[fills.length - 1].effectivePrice - fills[0].effectivePrice)
      : 0;

  const averagePrice =
    totalShares > 0 ? asProbability(totalCost / totalShares) : asProbability(0);

  const effectiveAveragePrice =
    totalShares > 0
      ? asProbability((totalCost + totalFees) / totalShares)
      : asProbability(0);

  return {
    side,
    requestedAmount: asDollars(amount),
    totalShares: asDollars(totalShares),
    totalCost: asDollars(totalCost),
    totalFees: asDollars(totalFees),
    averagePrice,
    effectiveAveragePrice,
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
    totalFees: asDollars(0),
    averagePrice: asProbability(0),
    effectiveAveragePrice: asProbability(0),
    fills: [],
    venueSummaries: [],
    priceImpact: 0,
    remainingAmount: amount,
  };
}
