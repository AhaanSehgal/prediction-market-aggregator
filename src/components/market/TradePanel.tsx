'use client';

import React, { useMemo, useState } from 'react';
import { useOrderBookStore } from '@/stores/orderbook-store';

const MAX_LEVELS = 10;

export function TradePanel() {
  const mergedBook = useOrderBookStore((s) => s.mergedBook);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'pro'>('market');

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
    <div className="flex flex-col h-full bg-surface overflow-hidden">
      {/* ── Order Book (Yes) header with resolution dropdown ── */}
      <div className="flex items-center justify-between px-3 h-9 border-b border-border shrink-0">
        <span className="text-[13px] font-medium text-foreground">Order Book <span className="text-muted">(Yes)</span></span>
        <div className="flex items-center gap-1 px-2 py-0.5 bg-surface-2 border border-border rounded text-[11px] font-mono text-muted-light cursor-pointer hover:bg-surface-3 transition-colors">
          0.1¢
          <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* ── Buy / Sell tabs ── */}
      <div className="grid grid-cols-2 border-b border-border shrink-0">
        <button
          onClick={() => setActiveTab('buy')}
          className={`py-2 text-[13px] font-medium text-center transition-colors ${
            activeTab === 'buy'
              ? 'text-bid border-b-2 border-bid'
              : 'text-muted hover:text-muted-light'
          }`}
        >
          Buy [Y]
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`py-2 text-[13px] font-medium text-center transition-colors ${
            activeTab === 'sell'
              ? 'text-ask border-b-2 border-ask'
              : 'text-muted hover:text-muted-light'
          }`}
        >
          Sell [Y]
        </button>
      </div>

      {/* ── Market / Limit / Pro tabs ── */}
      <div className="grid grid-cols-3 border-b border-border shrink-0">
        {(['market', 'limit', 'pro'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`py-1.5 text-[12px] font-medium text-center transition-colors ${
              orderType === type
                ? 'text-foreground bg-surface-2'
                : 'text-muted hover:text-muted-light'
            }`}
          >
            {type === 'pro' ? 'Pro ▾' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Bid/Ask balance bar ── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0">
        <span className="text-[11px] font-mono text-bid">B {bidPct}%</span>
        <div className="flex-1 flex h-[4px] rounded-full overflow-hidden">
          <div className="bg-bid h-full transition-all" style={{ width: `${bidPct}%` }} />
          <div className="bg-ask h-full flex-1" />
        </div>
        <span className="text-[11px] font-mono text-ask">{100 - bidPct}% S</span>
      </div>

      {/* ── Fill and Kill (FAK) ── */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-border shrink-0">
        <span className="text-[11px] text-muted">Fill and Kill (FAK)</span>
        <svg className="w-3.5 h-3.5 text-muted cursor-pointer hover:text-muted-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>

      {/* ── Column headers ── */}
      <div
        className="grid px-3 py-1 items-center text-[10px] font-mono text-muted border-b border-border shrink-0"
        style={{ gridTemplateColumns: '52px 1fr 72px' }}
      >
        <span>Price (¢)</span>
        <span className="text-right">Shares</span>
        <span className="text-right">Total (USD)</span>
      </div>

      {/* ── Order book ── */}
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

      {/* ── Trade form section ── */}
      <div className="border-t border-border shrink-0">
        {/* Shares input */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-[12px] text-muted-light">Shares</span>
          <span className="text-[11px] text-muted font-mono">Bal: --</span>
        </div>

        <div className="px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2 bg-surface-2 border border-border rounded px-3 py-2">
            <span className="text-[13px] text-muted">--</span>
            <span className="text-[13px] text-foreground">Yes</span>
            <span className="ml-auto text-[13px] text-muted font-mono">$0</span>
          </div>
        </div>

        {/* Quick amounts */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
          {['+$10', '+$50', '+$200', '+$1000'].map((amt) => (
            <button
              key={amt}
              className="px-2.5 py-1 text-[11px] font-mono text-muted-light bg-surface-2 border border-border rounded hover:bg-surface-3 transition-colors"
            >
              {amt}
            </button>
          ))}
          <button className="ml-auto p-1 text-muted hover:text-muted-light transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>

        {/* Slider */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <div className="flex-1 h-[3px] bg-surface-3 rounded-full">
            <div className="h-[3px] w-0 bg-accent rounded-full" />
          </div>
          <span className="text-[11px] font-mono text-muted w-8 text-right">0 %</span>
        </div>

        {/* Take Profit / Stop Loss */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-[12px] text-muted-light">Take Profit / Stop Loss</span>
          <button className="text-[11px] text-accent hover:text-accent/80 transition-colors">+ Add</button>
        </div>

        {/* Summary */}
        <div className="px-3 py-2 space-y-1 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-light">If you win</span>
            <span className="text-[12px] text-muted font-mono">--</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-light">Total</span>
            <span className="text-[12px] text-muted font-mono">--</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-light">Resolves</span>
            <span className="text-[12px] text-foreground font-mono">November 6, 2028</span>
          </div>
        </div>

        {/* Trade button */}
        <div className="px-3 py-3">
          <button className="w-full py-2.5 text-[14px] font-semibold text-background bg-bid hover:bg-bid-bright rounded-lg transition-colors">
            Trade
          </button>
        </div>

        {/* Footer */}
        <div className="px-3 pb-2 text-center">
          <span className="text-[10px] text-muted">
            By trading, you agree to our{' '}
            <span className="text-accent cursor-pointer hover:underline">Terms</span>
            {' & '}
            <span className="text-accent cursor-pointer hover:underline">Privacy</span>
          </span>
        </div>
      </div>
    </div>
  );
}
