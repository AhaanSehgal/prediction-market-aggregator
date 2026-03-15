import { Market } from './types';
import { asProbability } from '../orderbook/types';

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
      seriesTicker: 'KXPRESPERSON',
    },
  ],
  expiresAt: '2028-11-05T00:00:00Z',
};

export const VENUE_COLORS = {
  polymarket: '#7C5CFC',
  kalshi: '#3B82F6',
} as const;

export const VENUE_LABELS = {
  polymarket: 'Polymarket',
  kalshi: 'Kalshi',
} as const;
