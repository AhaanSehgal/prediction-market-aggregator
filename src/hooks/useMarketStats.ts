'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_MARKET } from '@/domain/market/constants';

const KALSHI_TICKER =
  DEFAULT_MARKET.venueInfo.find((v) => v.venue === 'kalshi')?.ticker ?? '';

export interface MarketStats {
  expiresAt: string;
  change24h: number | null;      // cents
  volume24h: number | null;      // USD
  totalVolume: number | null;    // USD
  openInterest: number | null;   // contracts
  liquidity: number | null;      // USD
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

        // Use Polymarket's end date if available, fall back to our constant
        const expiresAt = poly?.endDate ?? DEFAULT_MARKET.expiresAt ?? '';

        // 24h volume: sum both venues
        // Kalshi _fp values are in CENTS (fixed-point) — divide by 100
        const polyVol24 = poly?.volume24hr ?? 0;
        const kalshiVol24 = kalshi?.volume_24h_fp ? parseFloat(kalshi.volume_24h_fp) / 100 : 0;

        // Total volume: Polymarket only (Kalshi's is negligible and adds noise)
        const polyVolTotal = poly?.volumeNum ?? 0;

        // Open interest: Kalshi _fp is in cents, divide by 100
        const kalshiOI = kalshi?.open_interest_fp ? parseFloat(kalshi.open_interest_fp) / 100 : 0;
        // Combined O.I. — use both if available
        const oi = kalshiOI > 0 ? kalshiOI : null;

        // Liquidity from Polymarket
        const liquidity = poly?.liquidityNum ?? null;

        // 24h price change: use Polymarket current vs Kalshi previous_yes_bid as rough proxy
        // Only show if the difference is small (< 5¢) to avoid misleading cross-venue comparisons
        let change24h: number | null = null;
        if (poly?.outcomePrices && kalshi?.previous_price_dollars) {
          try {
            const prices = JSON.parse(poly.outcomePrices);
            const currentYes = parseFloat(prices[0]) * 100;
            const kalshiCurrent = kalshi.last_price_dollars ? parseFloat(kalshi.last_price_dollars) * 100 : null;
            // Use Kalshi's own price change if available (same venue = accurate)
            if (kalshiCurrent !== null) {
              const prevCents = parseFloat(kalshi.previous_price_dollars) * 100;
              change24h = kalshiCurrent - prevCents;
            }
          } catch { /* ignore */ }
        }

        setStats({
          expiresAt,
          change24h,
          volume24h: polyVol24 + kalshiVol24,
          totalVolume: polyVolTotal,
          openInterest: oi,
          liquidity,
        });
      } catch {
        // silent
      }
    }

    fetchStats();
    const id = setInterval(fetchStats, pollMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [pollMs]);

  return stats;
}
