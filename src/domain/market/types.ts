import { VenueId, Probability } from '../orderbook/types';

export interface Outcome {
  id: string;
  label: string;
  lastPrice: Probability | null;
}

export interface VenueMarketInfo {
  venue: VenueId;
  marketId: string;
  tokenId?: string;      // Polymarket uses token IDs for each outcome
  ticker?: string;       // Kalshi uses tickers
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
