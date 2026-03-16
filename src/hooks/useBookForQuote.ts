'use client';

import { useMemo } from 'react';
import { useOrderBookStore } from '@/stores/orderbook-store';
import { useQuoteStore } from '@/stores/quote-store';
import { calculateQuote } from '@/domain/orderbook/quote-engine';
import { uncrossBook, flipBookRaw } from '@/domain/orderbook/transforms';
import { MergedOrderBook, QuoteResult } from '@/domain/orderbook/types';

export interface BookForQuoteState {
  effectiveBook: MergedOrderBook;
  quote: QuoteResult | null;
  isNo: boolean;
  outcomeLabel: string;
  currentPrice: number | null;
}

export function useBookForQuote(inputAmount: number): BookForQuoteState {
  const mergedBook = useOrderBookStore((s) => s.mergedBook);
  const selectedOutcome = useQuoteStore((s) => s.selectedOutcome);
  const side = useQuoteStore((s) => s.side);

  const isNo = selectedOutcome === 'no';
  const outcomeLabel = isNo ? 'No' : 'Yes';

  // Raw book with all levels (including crossed) for the quote engine.
  // For NO, flip YES↔NO without uncrossing so crossed arb levels are fillable.
  const quoteBook = useMemo(() => {
    if (!isNo) return mergedBook;
    return flipBookRaw(mergedBook);
  }, [mergedBook, isNo]);

  // Uncrossed book just for midpoint / currentPrice display.
  const effectiveBook = useMemo(() => {
    return uncrossBook(quoteBook);
  }, [quoteBook]);

  const currentPrice = useMemo(() => {
    if (effectiveBook.midpoint === null) return null;
    return effectiveBook.midpoint;
  }, [effectiveBook.midpoint]);

  const quote = useMemo(() => {
    if (inputAmount <= 0) return null;
    return calculateQuote(quoteBook, inputAmount, side);
  }, [quoteBook, inputAmount, side]);

  return { effectiveBook, quote, isNo, outcomeLabel, currentPrice };
}
