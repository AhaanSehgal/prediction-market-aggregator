'use client';

import { useEffect } from 'react';
import { useMarketPrice } from '@/hooks/useMarketPrice';
import { useQuoteStore } from '@/stores/quote-store';

export function LiveTitle() {
  const yesPrice = useMarketPrice();
  const selectedOutcome = useQuoteStore((s) => s.selectedOutcome);

  useEffect(() => {
    if (yesPrice === null) return;
    const isNo = selectedOutcome === 'no';
    const price = isNo ? 1 - yesPrice : yesPrice;
    const cents = (price * 100).toFixed(1);
    const label = isNo ? 'No' : 'Yes';
    document.title = `${cents}¢ | ${label} | JD Vance 2028`;
  }, [yesPrice, selectedOutcome]);

  return null;
}
