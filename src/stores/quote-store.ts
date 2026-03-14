import { create } from 'zustand';
import { QuoteSide, QuoteResult } from '@/domain/orderbook/types';

interface QuoteState {
  dollarAmount: number;
  side: QuoteSide;
  selectedOutcome: 'yes' | 'no';
  quote: QuoteResult | null;

  setDollarAmount: (amount: number) => void;
  setSide: (side: QuoteSide) => void;
  setSelectedOutcome: (outcome: 'yes' | 'no') => void;
  setQuote: (quote: QuoteResult | null) => void;
}

export const useQuoteStore = create<QuoteState>((set) => ({
  dollarAmount: 100,
  side: 'buy',
  selectedOutcome: 'yes',
  quote: null,

  setDollarAmount: (amount) => set({ dollarAmount: amount }),
  setSide: (side) => set({ side }),
  setSelectedOutcome: (outcome) => set({ selectedOutcome: outcome }),
  setQuote: (quote) => set({ quote }),
}));
