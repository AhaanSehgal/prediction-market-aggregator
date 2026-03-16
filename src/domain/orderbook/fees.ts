import { VenueId } from './types';

export interface VenueFeeConfig {
  takerRate: number;
  makerRate: number;
  exponent: number;
}

export const VENUE_FEES: Record<VenueId, VenueFeeConfig> = {
  polymarket: { takerRate: 0, makerRate: 0, exponent: 1 },
  kalshi: { takerRate: 0.07, makerRate: 0.0175, exponent: 1 },
};

export function takerFeePerContract(venue: VenueId, price: number): number {
  const cfg = VENUE_FEES[venue];
  const base = Math.pow(price * (1 - price), cfg.exponent);
  return cfg.takerRate * base;
}

export function effectiveBuyPrice(venue: VenueId, price: number): number {
  return price + takerFeePerContract(venue, price);
}

export function effectiveSellPrice(venue: VenueId, price: number): number {
  return price - takerFeePerContract(venue, price);
}
