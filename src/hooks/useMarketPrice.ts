'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_MARKET } from '@/domain/market/constants';

const POLY_TOKEN =
  DEFAULT_MARKET.venueInfo.find((v) => v.venue === 'polymarket')?.tokenId ?? '';

/**
 * Polls the Polymarket CLOB midpoint for the real YES price.
 * Returns a probability (0-1) or null while loading.
 */
export function useMarketPrice(pollMs = 10_000) {
  const [yesPrice, setYesPrice] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrice() {
      try {
        const resp = await fetch(`/api/midpoint?token_id=${POLY_TOKEN}`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (!cancelled && data.mid != null) {
          setYesPrice(parseFloat(data.mid));
        }
      } catch {
        // silent
      }
    }

    fetchPrice();
    const id = setInterval(fetchPrice, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollMs]);

  return yesPrice;
}
