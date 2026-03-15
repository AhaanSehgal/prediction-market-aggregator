'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_MARKET } from '@/domain/market/constants';

const KALSHI_TICKER =
  DEFAULT_MARKET.venueInfo.find((v) => v.venue === 'kalshi')?.ticker ?? '';

export interface MarketStats {
  expiresAt: string;
  change24h: number | null;
  volume24h: number | null;
  totalVolume: number | null;
  openInterest: number | null;
  liquidity: number | null;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export function formatStats(s: MarketStats) {
  return {
    expires: new Date(s.expiresAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    change24h: s.change24h !== null
      ? `${s.change24h >= 0 ? '+' : ''}${s.change24h.toFixed(1)}¢`
      : '—',
    change24hPositive: (s.change24h ?? 0) >= 0,
    volume24h: s.volume24h !== null ? fmt(s.volume24h) : '—',
    totalVolume: s.totalVolume !== null ? fmt(s.totalVolume) : '—',
    openInterest: s.openInterest !== null ? fmt(s.openInterest) : '—',
    liquidity: s.liquidity !== null ? `$${fmt(s.liquidity)}` : '—',
  };
}

export function useMarketStats(pollMs = 30_000): MarketStats {
  const [stats, setStats] = useState<MarketStats>({
    expiresAt: DEFAULT_MARKET.expiresAt ?? '',
    change24h: null,
    volume24h: null,
    totalVolume: null,
    openInterest: null,
    liquidity: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const [polyResp, kalshiResp] = await Promise.all([
          fetch('/api/polymarket-market').then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/kalshi-market?ticker=${KALSHI_TICKER}`).then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);

        if (cancelled) return;

        const poly = polyResp;
        const kalshi = kalshiResp?.market;

        const expiresAt = poly?.endDate ?? DEFAULT_MARKET.expiresAt ?? '';

        const polyVol24 = poly?.volume24hr ?? 0;
        const kalshiVol24 = kalshi?.volume_24h_fp ? parseFloat(kalshi.volume_24h_fp) / 100 : 0;

        const polyVolTotal = poly?.volumeNum ?? 0;

        const kalshiOI = kalshi?.open_interest_fp ? parseFloat(kalshi.open_interest_fp) / 100 : 0;
        const oi = kalshiOI > 0 ? kalshiOI : null;

        const liquidity = poly?.liquidityNum ?? null;

        let change24h: number | null = null;
        if (poly?.outcomePrices && kalshi?.previous_price_dollars) {
          try {
            const kalshiCurrent = kalshi.last_price_dollars ? parseFloat(kalshi.last_price_dollars) * 100 : null;
            if (kalshiCurrent !== null) {
              const prevCents = parseFloat(kalshi.previous_price_dollars) * 100;
              change24h = kalshiCurrent - prevCents;
            }
          } catch {}
        }

        setStats({
          expiresAt,
          change24h,
          volume24h: polyVol24 + kalshiVol24,
          totalVolume: polyVolTotal,
          openInterest: oi,
          liquidity,
        });
      } catch {}
    }

    fetchStats();
    const id = setInterval(fetchStats, pollMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [pollMs]);

  return stats;
}
