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
    { id: 'yes', label: 'Yes', lastPrice: asProbability(0.20) },
    { id: 'no', label: 'No', lastPrice: asProbability(0.80) },
  ],
  venueInfo: [
    {
      venue: 'polymarket',
      marketId: 'jd-vance-wins-2028',
      tokenId: '16040015440196279900485035793550429453516625694844857319147506590755961451627',
    },
    {
      venue: 'kalshi',
      marketId: 'KXPRESPERSON-28-JVAN',
      ticker: 'KXPRESPERSON-28-JVAN',
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
