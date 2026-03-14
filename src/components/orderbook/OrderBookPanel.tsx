'use client';

import React, { useMemo } from 'react';
import { useOrderBookStore } from '@/stores/orderbook-store';

const MAX_LEVELS = 12;

export function OrderBookPanel() {
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

  const bidTotal = bidCumulatives[bidCumulatives.length - 1] ?? 0;
  const askTotal = askCumulatives[0] ?? 0;
  const bidPct = bidTotal + askTotal > 0 ? Math.round((bidTotal / (bidTotal + askTotal)) * 100) : 50;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b border-border shrink-0">
        <span className="text-[13px] font-medium text-foreground">
          Order Book <span className="text-muted">(Yes)</span>
        </span>
        <div className="flex items-center gap-1 px-2 py-0.5 bg-surface-2 border border-border rounded text-[11px] font-mono text-muted-light cursor-pointer hover:bg-surface-3 transition-colors">
          0.1¢
          <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Bid/Ask balance */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0">
        <span className="text-[11px] font-mono text-bid">B {bidPct}%</span>
        <div className="flex-1 flex h-[4px] rounded-full overflow-hidden">
          <div className="bg-bid h-full transition-all" style={{ width: `${bidPct}%` }} />
          <div className="bg-ask h-full flex-1" />
        </div>
        <span className="text-[11px] font-mono text-ask">{100 - bidPct}% S</span>
      </div>

      {/* Column headers */}
      <div
        className="grid px-3 py-1 items-center text-[10px] font-mono text-muted border-b border-border shrink-0"
        style={{ gridTemplateColumns: '52px 1fr 72px' }}
      >
        <span>Price (¢)</span>
        <span className="text-right">Shares</span>
        <span className="text-right">Total (USD)</span>
      </div>

      {/* Order book rows */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {asks.length === 0 && bids.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted text-[11px] font-mono">
            Waiting for data...
          </div>
        ) : (
          <>
            {/* Asks */}
            <div className="flex-1 flex flex-col justify-end overflow-hidden">
              <div className="overflow-y-auto">
                {asks.map((level, i) => {
                  const barWidth = maxCumulative > 0 ? Math.min(((askCumulatives[i] ?? 0) / maxCumulative) * 100, 100) : 0;
                  const totalUsd = level.totalSize * level.price;
                  return (
                    <div key={`a-${level.price}`} className="relative h-[21px] flex items-center text-[11px] font-mono cursor-default hover:bg-white/[0.03]">
                      <div className="absolute inset-y-0 right-0 pointer-events-none" style={{ width: `${barWidth}%`, background: 'var(--ask-bar)' }} />
                      <div className="relative z-10 grid w-full items-center tabular-nums" style={{ gridTemplateColumns: '52px 1fr 72px' }}>
                        <span className="pl-3 text-ask">{(level.price * 100).toFixed(1)}¢</span>
                        <span className="text-right text-foreground">{level.totalSize.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="text-right pr-3 text-muted-light">${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Spread */}
            <div className="flex items-center justify-between px-3 h-6 border-y border-border bg-surface-2 shrink-0">
              <span className="text-[11px] font-mono text-muted">Spread</span>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                {mergedBook.spread !== null && (
                  <span className="text-muted-light">
                    {(mergedBook.spread * 100).toFixed(1)}¢
                  </span>
                )}
                {mergedBook.spread !== null && mergedBook.midpoint !== null && (
                  <span className="text-muted">
                    {((mergedBook.spread / mergedBook.midpoint) * 100).toFixed(3)}%
                  </span>
                )}
              </div>
            </div>

            {/* Bids */}
            <div className="flex-1 overflow-y-auto">
              {bids.map((level, i) => {
                const barWidth = maxCumulative > 0 ? Math.min(((bidCumulatives[i] ?? 0) / maxCumulative) * 100, 100) : 0;
                const totalUsd = level.totalSize * level.price;
                return (
                  <div key={`b-${level.price}`} className="relative h-[21px] flex items-center text-[11px] font-mono cursor-default hover:bg-white/[0.03]">
                    <div className="absolute inset-y-0 right-0 pointer-events-none" style={{ width: `${barWidth}%`, background: 'var(--bid-bar)' }} />
                    <div className="relative z-10 grid w-full items-center tabular-nums" style={{ gridTemplateColumns: '52px 1fr 72px' }}>
                      <span className="pl-3 text-bid">{(level.price * 100).toFixed(1)}¢</span>
                      <span className="text-right text-foreground">{level.totalSize.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-right pr-3 text-muted-light">${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
