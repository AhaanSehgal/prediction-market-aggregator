'use client';

import { useMemo } from 'react';
import { useOrderBookStore } from '@/stores/orderbook-store';
import { useQuoteStore } from '@/stores/quote-store';
import { calculateQuote } from '@/domain/orderbook/quote-engine';
import { QuoteResult } from '@/domain/orderbook/types';

export function useQuote(): QuoteResult | null {
  const mergedBook = useOrderBookStore((s) => s.mergedBook);
  const dollarAmount = useQuoteStore((s) => s.dollarAmount);
  const side = useQuoteStore((s) => s.side);

  const quote = useMemo(() => {
    if (dollarAmount <= 0) return null;
    if (mergedBook.asks.length === 0 && mergedBook.bids.length === 0) {
      return null;
    }
    return calculateQuote(mergedBook, dollarAmount, side);
  }, [mergedBook, dollarAmount, side]);

  return quote;
}
