import { VenueId, Probability } from '../orderbook/types';

export interface Outcome {
  id: string;
  label: string;
  lastPrice: Probability | null;
}

export interface VenueMarketInfo {
  venue: VenueId;
  marketId: string;
  tokenId?: string;
  ticker?: string;
  seriesTicker?: string;
}

export interface Market {
  id: string;
  title: string;
  description?: string;
  category: string;
  outcomes: [Outcome, Outcome]; // Binary market = exactly 2 outcomes
  venueInfo: VenueMarketInfo[];
  expiresAt?: string;
}
