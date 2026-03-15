'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_MARKET } from '@/domain/market/constants';

const KALSHI_TICKER =
  DEFAULT_MARKET.venueInfo.find((v) => v.venue === 'kalshi')?.ticker ?? '';

export interface VenueBreakdown {
  polymarket: number;
  kalshi: number;
}

export interface MarketStats {
  expiresAt: string;
  change24h: number | null;
  volume24h: number | null;
  totalVolume: number | null;
  openInterest: number | null;
  liquidity: number | null;
  breakdown: {
    volume24h: VenueBreakdown;
    totalVolume: VenueBreakdown;
    liquidity: VenueBreakdown;
  };
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtBreakdown(b: VenueBreakdown, prefix = '') {
  const p = b.polymarket > 0 ? `${prefix}${fmt(b.polymarket)}` : null;
  const k = b.kalshi > 0 ? `${prefix}${fmt(b.kalshi)}` : null;
  return { polymarket: p, kalshi: k };
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
    breakdown: {
      volume24h: fmtBreakdown(s.breakdown.volume24h),
      totalVolume: fmtBreakdown(s.breakdown.totalVolume),
      liquidity: fmtBreakdown(s.breakdown.liquidity, '$'),
    },
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
    breakdown: {
      volume24h: { polymarket: 0, kalshi: 0 },
      totalVolume: { polymarket: 0, kalshi: 0 },
      liquidity: { polymarket: 0, kalshi: 0 },
    },
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

        const fp = (v: unknown) => (typeof v === 'string' ? parseFloat(v) : 0) || 0;

        const polyVol24 = poly?.volume24hr ?? 0;
        const kalshiVol24 = fp(kalshi?.volume_24h_fp);

        const polyVolTotal = poly?.volumeNum ?? 0;
        const kalshiVolTotal = fp(kalshi?.volume_fp);

        const polyLiquidity = poly?.liquidityNum ?? 0;
        const kalshiLiquidity = fp(kalshi?.liquidity_dollars);

        const kalshiOI = fp(kalshi?.open_interest_fp);
        const polyOI = poly?.openInterest ?? 0;

        let change24h: number | null = null;
        const polyPrices = poly?.outcomePrices ? JSON.parse(poly.outcomePrices) : null;
        const polyCurrentCents = polyPrices ? parseFloat(polyPrices[0]) * 100 : null;
        const kalshiCurrentCents = kalshi?.last_price_dollars ? parseFloat(kalshi.last_price_dollars) * 100 : null;
        const kalshiPrevCents = kalshi?.previous_price_dollars ? parseFloat(kalshi.previous_price_dollars) * 100 : null;

        if (kalshiCurrentCents !== null && kalshiPrevCents !== null) {
          change24h = kalshiCurrentCents - kalshiPrevCents;
        } else if (poly?.previousDayPrice != null && polyCurrentCents !== null) {
          change24h = polyCurrentCents - parseFloat(poly.previousDayPrice) * 100;
        }

        setStats({
          expiresAt,
          change24h,
          volume24h: polyVol24 + kalshiVol24,
          totalVolume: polyVolTotal + kalshiVolTotal,
          openInterest: (polyOI + kalshiOI) > 0 ? polyOI + kalshiOI : null,
          liquidity: (polyLiquidity + kalshiLiquidity) > 0 ? polyLiquidity + kalshiLiquidity : null,
          breakdown: {
            volume24h: { polymarket: polyVol24, kalshi: kalshiVol24 },
            totalVolume: { polymarket: polyVolTotal, kalshi: kalshiVolTotal },
            liquidity: { polymarket: polyLiquidity, kalshi: kalshiLiquidity },
          },
        });
      } catch {}
    }

    fetchStats();
    const id = setInterval(fetchStats, pollMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [pollMs]);

  return stats;
}
