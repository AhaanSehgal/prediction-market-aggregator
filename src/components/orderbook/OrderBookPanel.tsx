'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useOrderBookStore } from '@/stores/orderbook-store';
import { useQuoteStore } from '@/stores/quote-store';
import { MergedPriceLevel, asProbability, asDollars } from '@/domain/orderbook/types';
import { VENUE_COLORS, VENUE_LABELS } from '@/domain/market/constants';

const MAX_LEVELS = 12;
const TICK_OPTIONS = [0.1, 0.2, 0.5, 1, 2];

function groupByTick(levels: MergedPriceLevel[], tickCents: number, side: 'bid' | 'ask'): MergedPriceLevel[] {
  if (tickCents <= 0.1) return levels;
  const tickDecimal = tickCents / 100;
  const grouped = new Map<number, MergedPriceLevel>();

  for (const level of levels) {
    const key = side === 'bid'
      ? Math.floor(level.price / tickDecimal) * tickDecimal
      : Math.ceil(level.price / tickDecimal) * tickDecimal;
    const rounded = Math.round(key * 10000) / 10000;

    const existing = grouped.get(rounded);
    if (existing) {
      const mergedVenues = [...existing.venues];
      for (const v of level.venues) {
        const ev = mergedVenues.find((mv) => mv.venue === v.venue);
        if (ev) ev.size = asDollars(ev.size + v.size);
        else mergedVenues.push({ ...v });
      }
      grouped.set(rounded, {
        price: asProbability(rounded),
        totalSize: asDollars(existing.totalSize + level.totalSize),
        venues: mergedVenues,
      });
    } else {
      grouped.set(rounded, {
        price: asProbability(rounded),
        totalSize: level.totalSize,
        venues: level.venues.map((v) => ({ ...v })),
      });
    }
  }

  const result = Array.from(grouped.values());
  return side === 'bid'
    ? result.sort((a, b) => b.price - a.price)
    : result.sort((a, b) => a.price - b.price);
}

/**
 * Depth bar with venue-colored gradient.
 * Uses a smooth gradient blending venue brand colors to show the mix.
 * Single-venue rows tint the standard side color with the venue color.
 */
function DepthBar({
  level,
  barWidthPct,
  side,
}: {
  level: MergedPriceLevel;
  barWidthPct: number;
  side: 'bid' | 'ask';
}) {
  if (barWidthPct <= 0 || level.totalSize <= 0) return null;

  const sideColor = side === 'bid' ? 'rgba(0, 192, 118, 0.13)' : 'rgba(255, 77, 106, 0.13)';

  if (level.venues.length <= 1) {
    // Single venue: side-colored bar with subtle venue tint blended in
    const venueColor = VENUE_COLORS[level.venues[0]?.venue ?? 'polymarket'];
    return (
      <div
        className="absolute inset-y-0 right-0 pointer-events-none"
        style={{
          width: `${barWidthPct}%`,
          background: `linear-gradient(90deg, ${venueColor}18, ${sideColor})`,
        }}
      />
    );
  }

  // Multiple venues: gradient that transitions from one venue color to the other
  // Proportional to each venue's contribution
  const sorted = [...level.venues].sort((a, b) => b.size - a.size);
  const dominantPct = (sorted[0].size / level.totalSize) * 100;
  const c1 = VENUE_COLORS[sorted[0].venue];
  const c2 = VENUE_COLORS[sorted[1].venue];

  return (
    <div
      className="absolute inset-y-0 right-0 pointer-events-none"
      style={{
        width: `${barWidthPct}%`,
        background: `linear-gradient(90deg, ${c2}30 0%, ${c2}20 ${100 - dominantPct}%, ${c1}20 ${100 - dominantPct}%, ${c1}30 100%)`,
      }}
    />
  );
}


/** Venue breakdown tooltip shown on hover */
function VenueTooltip({ level, side }: { level: MergedPriceLevel; side: 'bid' | 'ask' }) {
  return (
    <div className="absolute left-1 bottom-full mb-1 z-50 bg-surface-3 border border-border-light rounded-md px-2.5 py-2 shadow-lg pointer-events-none whitespace-nowrap">
      <div className="text-[10px] font-mono text-muted-light mb-1.5 font-medium">
        {(level.price * 100).toFixed(1)}¢ — {side === 'bid' ? 'Buy' : 'Sell'} Side
      </div>
      {level.venues.map((v) => (
        <div key={v.venue} className="flex items-center gap-2 text-[10px] font-mono py-0.5">
          <span
            className="inline-block w-[8px] h-[8px] rounded-sm"
            style={{ background: VENUE_COLORS[v.venue] }}
          />
          <span className="text-muted-light min-w-[70px]">{VENUE_LABELS[v.venue]}</span>
          <span className="text-foreground font-medium ml-auto pl-4">
            {v.size.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} shares
          </span>
        </div>
      ))}
      {level.venues.length > 1 && (
        <>
          <div className="border-t border-border mt-1.5 pt-1.5 flex items-center gap-2 text-[10px] font-mono">
            <span className="w-[8px]" />
            <span className="text-muted min-w-[70px]">Combined</span>
            <span className="text-foreground font-medium ml-auto pl-4">
              {level.totalSize.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} shares
            </span>
          </div>
          {/* Visual split bar in tooltip */}
          <div className="flex h-[4px] w-full rounded-full overflow-hidden mt-1.5">
            {level.venues.map((v) => (
              <div
                key={v.venue}
                className="h-full"
                style={{
                  width: `${(v.size / level.totalSize) * 100}%`,
                  background: VENUE_COLORS[v.venue],
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[9px] font-mono text-muted mt-0.5">
            {level.venues.map((v) => (
              <span key={v.venue}>{Math.round((v.size / level.totalSize) * 100)}% {v.venue === 'polymarket' ? 'PM' : 'KA'}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Flip a book for the NO outcome: bids become asks at (1-price), asks become bids at (1-price). */
function flipLevels(levels: MergedPriceLevel[]): MergedPriceLevel[] {
  return levels.map((l) => ({
    ...l,
    price: asProbability(1 - l.price),
    venues: l.venues.map((v) => ({ ...v })),
  }));
}

export function OrderBookPanel() {
  const mergedBook = useOrderBookStore((s) => s.mergedBook);
  const selectedOutcome = useQuoteStore((s) => s.selectedOutcome);
  const [tickSize, setTickSize] = useState(0.1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const asksScrollRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // When NO is selected, flip the book: YES bids → NO asks (at 1-price) and vice versa
  const isNo = selectedOutcome === 'no';

  const rawAsks = useMemo(() => {
    if (isNo) {
      // YES bids → NO asks, flip prices, sort ascending
      const flipped = flipLevels(mergedBook.bids);
      return flipped.sort((a, b) => a.price - b.price);
    }
    return mergedBook.asks;
  }, [mergedBook.bids, mergedBook.asks, isNo]);

  const rawBids = useMemo(() => {
    if (isNo) {
      // YES asks → NO bids, flip prices, sort descending
      const flipped = flipLevels(mergedBook.asks);
      return flipped.sort((a, b) => b.price - a.price);
    }
    return mergedBook.bids;
  }, [mergedBook.bids, mergedBook.asks, isNo]);

  const asks = useMemo(
    () => groupByTick(rawAsks, tickSize, 'ask').slice(0, MAX_LEVELS).reverse(),
    [rawAsks, tickSize]
  );
  const bids = useMemo(
    () => groupByTick(rawBids, tickSize, 'bid').slice(0, MAX_LEVELS),
    [rawBids, tickSize]
  );

  // Auto-scroll asks to bottom
  useEffect(() => {
    if (asksScrollRef.current) {
      asksScrollRef.current.scrollTop = asksScrollRef.current.scrollHeight;
    }
  }, [asks]);

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

  // Per-level USD (shares × price) — matches Fireplace's "Total (USD)" column
  const askLevelUsd = useMemo(() =>
    asks.map((l) => l.totalSize * l.price),
    [asks]
  );

  const bidLevelUsd = useMemo(() =>
    bids.map((l) => l.totalSize * l.price),
    [bids]
  );

  // B/S ratio uses the full (possibly flipped) book
  const bidTotal = useMemo(
    () => rawBids.reduce((sum, l) => sum + l.totalSize, 0),
    [rawBids]
  );
  const askTotal = useMemo(
    () => rawAsks.reduce((sum, l) => sum + l.totalSize, 0),
    [rawAsks]
  );
  const bidPct = bidTotal + askTotal > 0 ? Math.round((bidTotal / (bidTotal + askTotal)) * 100) : 50;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b border-border shrink-0">
        <span className="text-[13px] font-medium text-foreground whitespace-nowrap">
          Order Book <span className="text-muted">({isNo ? 'No' : 'Yes'})</span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Tick size dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 px-2 py-0.5 bg-surface-2 border border-border rounded text-[11px] font-mono text-muted-light cursor-pointer hover:bg-surface-3 transition-colors"
            >
              {tickSize}¢
              <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-surface-2 border border-border rounded shadow-lg z-50 min-w-[60px]">
                {TICK_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTickSize(t); setDropdownOpen(false); }}
                    className={`block w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors ${
                      t === tickSize ? 'text-foreground bg-surface-3' : 'text-muted-light hover:bg-surface-3'
                    }`}
                  >
                    {t}¢
                  </button>
                ))}
              </div>
            )}
          </div>
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
              <div ref={asksScrollRef} className="overflow-y-auto">
                {asks.map((level, i) => {
                  const barWidth = maxCumulative > 0 ? Math.min(((askCumulatives[i] ?? 0) / maxCumulative) * 100, 100) : 0;
                  const levelUsd = askLevelUsd[i] ?? 0;
                  const rowKey = `a-${level.price}`;
                  const isHovered = hoveredRow === rowKey;
                  return (
                    <div
                      key={rowKey}
                      className="relative h-[22px] flex items-center text-[11px] font-mono cursor-default hover:bg-white/[0.03]"
                      onMouseEnter={() => setHoveredRow(rowKey)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <DepthBar level={level} barWidthPct={barWidth} side="ask" />
                      <div className="relative z-10 grid w-full items-center tabular-nums" style={{ gridTemplateColumns: '52px 1fr 72px' }}>
                        <span className="pl-3 text-ask">{(level.price * 100).toFixed(1)}¢</span>
                        <span className="text-right text-foreground">
                          {level.totalSize.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-right pr-3 text-muted-light">
                          ${levelUsd.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </span>
                      </div>
                      {isHovered && <VenueTooltip level={level} side="ask" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Spread */}
            <div className="flex items-center justify-between px-3 h-6 border-y border-border bg-surface-2 shrink-0">
              <span className="text-[11px] font-mono text-muted">Spread</span>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                {mergedBook.spread !== null && (() => {
                  const midpoint = isNo && mergedBook.midpoint !== null ? 1 - mergedBook.midpoint : mergedBook.midpoint;
                  return (
                    <>
                      <span className="text-muted-light">
                        {Math.abs(mergedBook.spread * 100).toFixed(1)}¢
                      </span>
                      {midpoint !== null && (
                        <span className="text-muted">
                          {Math.abs((mergedBook.spread / midpoint) * 100).toFixed(3)}%
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Bids */}
            <div className="flex-1 overflow-y-auto">
              {bids.map((level, i) => {
                const barWidth = maxCumulative > 0 ? Math.min(((bidCumulatives[i] ?? 0) / maxCumulative) * 100, 100) : 0;
                const levelUsd = bidLevelUsd[i] ?? 0;
                const rowKey = `b-${level.price}`;
                const isHovered = hoveredRow === rowKey;
                return (
                  <div
                    key={rowKey}
                    className="relative h-[22px] flex items-center text-[11px] font-mono cursor-default hover:bg-white/[0.03]"
                    onMouseEnter={() => setHoveredRow(rowKey)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <DepthBar level={level} barWidthPct={barWidth} side="bid" />
                    <div className="relative z-10 grid w-full items-center tabular-nums" style={{ gridTemplateColumns: '52px 1fr 72px' }}>
                      <span className="pl-3 text-bid">{(level.price * 100).toFixed(1)}¢</span>
                      <span className="text-right text-foreground">
                        {level.totalSize.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-right pr-3 text-muted-light">
                        ${levelUsd.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </span>
                    </div>
                    {isHovered && <VenueTooltip level={level} side="bid" />}
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
