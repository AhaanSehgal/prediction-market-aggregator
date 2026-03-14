'use client';

import { useOrderBookStore } from '@/stores/orderbook-store';
import { DEFAULT_MARKET } from '@/domain/market/constants';
import { formatCents, formatSpread } from '@/lib/utils';

export function MarketHeader() {
  const mergedBook = useOrderBookStore((s) => s.mergedBook);

  return (
    <div className="flex items-center gap-4">
      <h1 className="text-sm font-medium text-foreground truncate max-w-md">
        {DEFAULT_MARKET.title}
      </h1>
      <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
        {mergedBook.bestBid !== null && (
          <div className="flex items-center gap-1">
            <span className="text-muted">Bid</span>
            <span className="text-bid">{formatCents(mergedBook.bestBid)}</span>
          </div>
        )}
        {mergedBook.bestAsk !== null && (
          <div className="flex items-center gap-1">
            <span className="text-muted">Ask</span>
            <span className="text-ask">{formatCents(mergedBook.bestAsk)}</span>
          </div>
        )}
        {mergedBook.midpoint !== null && (
          <div className="flex items-center gap-1">
            <span className="text-muted">Mid</span>
            <span className="text-foreground">{formatCents(mergedBook.midpoint)}</span>
          </div>
        )}
        {mergedBook.spread !== null && (
          <div className="flex items-center gap-1">
            <span className="text-muted">Spread</span>
            <span className="text-foreground">{formatSpread(mergedBook.spread)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
