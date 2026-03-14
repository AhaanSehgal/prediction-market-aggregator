import { Market } from './types';
import { asProbability } from '../orderbook/types';

// JD Vance 2028 Presidential Election market
// Polymarket token ID sourced from their public CLOB API
// Kalshi ticker follows their standard political market format
export const DEFAULT_MARKET: Market = {
  id: 'jd-vance-2028-president',
  title: 'Will JD Vance win the 2028 US Presidential Election?',
  description: 'This market resolves to "Yes" if JD Vance wins the 2028 United States Presidential Election.',
  category: 'Politics',
  outcomes: [
    { id: 'yes', label: 'Yes', lastPrice: asProbability(0.35) },
    { id: 'no', label: 'No', lastPrice: asProbability(0.65) },
  ],
  venueInfo: [
    {
      venue: 'polymarket',
      marketId: 'jd-vance-wins-2028',
      // This token ID will need to be updated with the real one from Polymarket
      tokenId: '21742633143463906290569050155826241533067272736897614950488156847949938836455',
    },
    {
      venue: 'kalshi',
      marketId: 'PRES-2028-JDV',
      ticker: 'PRES-2028-JDV',
    },
  ],
  expiresAt: '2028-11-05T00:00:00Z',
};

export const VENUE_COLORS = {
  polymarket: '#7C5CFC',  // Purple
  kalshi: '#3B82F6',      // Blue
} as const;

export const VENUE_LABELS = {
  polymarket: 'Polymarket',
  kalshi: 'Kalshi',
} as const;
