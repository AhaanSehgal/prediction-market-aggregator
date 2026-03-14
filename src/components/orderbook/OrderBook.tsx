'use client';

import React, { useMemo } from 'react';
import { useOrderBookStore } from '@/stores/orderbook-store';
import { OrderBookRow } from './OrderBookRow';
import { formatSpread } from '@/lib/utils';
import { VENUE_COLORS } from '@/domain/market/constants';

const MAX_LEVELS = 12;

export function OrderBook() {
  const mergedBook = useOrderBookStore((s) => s.mergedBook);

  const asks = useMemo(
    () => mergedBook.asks.slice(0, MAX_LEVELS).reverse(),
    [mergedBook.asks]
  );
  const bids = useMemo(
    () => mergedBook.bids.slice(0, MAX_LEVELS),
    [mergedBook.bids]
  );

  const askCumulatives = useMemo(() => {
    const cum: number[] = new Array(asks.length);
    let total = 0;
    for (let i = asks.length - 1; i >= 0; i--) {
      total += asks[i].totalSize;
      cum[i] = total;
    }
    return cum;
  }, [asks]);

  const bidCumulatives = useMemo(() => {
    const cum: number[] = new Array(bids.length);
    let total = 0;
    for (let i = 0; i < bids.length; i++) {
      total += bids[i].totalSize;
      cum[i] = total;
    }
    return cum;
  }, [bids]);

  const maxCumulative = useMemo(
    () => Math.max(askCumulatives[0] ?? 0, bidCumulatives[bidCumulatives.length - 1] ?? 0, 1),
    [askCumulatives, bidCumulatives]
  );

  const isEmpty = asks.length === 0 && bids.length === 0;

  // Bid/ask balance for the horizontal bar
  const bidTotal = bidCumulatives[bidCumulatives.length - 1] ?? 0;
  const askTotal = askCumulatives[0] ?? 0;
  const bidPct = bidTotal + askTotal > 0 ? Math.round((bidTotal / (bidTotal + askTotal)) * 100) : 50;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 h-8 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-foreground">Order Book</span>
          <span className="text-[11px] text-muted">(Yes)</span>
        </div>
        {/* Venue legend */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: VENUE_COLORS.polymarket }} />
            Poly
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: VENUE_COLORS.kalshi }} />
            Kalshi
          </span>
        </div>
      </div>

      {/* Bid/Ask balance bar */}
      <div className="flex items-center gap-2 px-2 h-6 border-b border-border shrink-0">
        <span className="text-[10px] font-mono text-bid">B {bidPct}%</span>
        <div className="flex-1 flex h-[3px] rounded-full overflow-hidden">
          <div className="bg-bid/60 h-full" style={{ width: `${bidPct}%` }} />
          <div className="bg-ask/60 h-full flex-1" />
        </div>
        <span className="text-[10px] font-mono text-ask">{100 - bidPct}% S</span>
      </div>

      {/* Column headers */}
      <div
        className="grid px-2 h-5 items-center text-[10px] font-mono text-muted border-b border-border shrink-0"
        style={{ gridTemplateColumns: '48px 1fr 68px' }}
      >
        <span className="pl-0">Price (¢)</span>
        <span className="text-right">Shares</span>
        <span className="text-right pr-0">Total (USD)</span>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center text-muted text-[11px] font-mono">
          Waiting for data...
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Asks */}
          <div className="flex-1 flex flex-col justify-end overflow-hidden">
            <div className="overflow-y-auto">
              {asks.map((level, i) => (
                <OrderBookRow
                  key={`a-${level.price}`}
                  level={level}
                  side="ask"
                  cumulativeSize={askCumulatives[i] ?? 0}
                  maxCumulativeSize={maxCumulative}
                />
              ))}
            </div>
          </div>

          {/* Spread */}
          <div className="flex items-center justify-between px-2 h-7 border-y border-border bg-surface-2 shrink-0">
            <span className="text-[11px] font-mono text-muted">Spread</span>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              {mergedBook.spread !== null && (
                <span className="text-foreground">
                  {Math.round(mergedBook.spread * 100)}¢
                </span>
              )}
              {mergedBook.spread !== null && mergedBook.midpoint !== null && (
                <span className="text-muted">
                  {((mergedBook.spread / mergedBook.midpoint) * 100).toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Bids */}
          <div className="flex-1 overflow-y-auto">
            {bids.map((level, i) => (
              <OrderBookRow
                key={`b-${level.price}`}
                level={level}
                side="bid"
                cumulativeSize={bidCumulatives[i] ?? 0}
                maxCumulativeSize={maxCumulative}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
