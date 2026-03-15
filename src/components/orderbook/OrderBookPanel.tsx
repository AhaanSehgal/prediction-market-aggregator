'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useOrderBookStore } from '@/stores/orderbook-store';
import { useQuoteStore } from '@/stores/quote-store';
import { MergedPriceLevel, asProbability, asDollars } from '@/domain/orderbook/types';
import { VENUE_COLORS, VENUE_LABELS } from '@/domain/market/constants';

const MAX_LEVELS = 12;
const TICK_OPTIONS_ALL = [0.1, 0.2, 0.5, 1, 2];
const TICK_OPTIONS_KALSHI = [1, 2];

function fmtCompact(n: number, prefix = ''): string {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 100_000) return `${prefix}${(n / 1_000).toFixed(1)}K`;
  if (n >= 10_000) return `${prefix}${(n / 1_000).toFixed(2)}K`;
  return `${prefix}${n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
}

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
    const venueColor = VENUE_COLORS[level.venues[0]?.venue ?? 'polymarket'];
    return (
      <div
        className="absolute inset-y-0 left-0 pointer-events-none"
        style={{
          width: `${barWidthPct}%`,
          background: `linear-gradient(90deg, ${venueColor}18, ${sideColor})`,
        }}
      />
    );
  }

  const sorted = [...level.venues].sort((a, b) => b.size - a.size);
  const dominantPct = (sorted[0].size / level.totalSize) * 100;
  const c1 = VENUE_COLORS[sorted[0].venue];
  const c2 = VENUE_COLORS[sorted[1].venue];

  return (
    <div
      className="absolute inset-y-0 left-0 pointer-events-none"
      style={{
        width: `${barWidthPct}%`,
        background: `linear-gradient(90deg, ${c2}30 0%, ${c2}20 ${100 - dominantPct}%, ${c1}20 ${100 - dominantPct}%, ${c1}30 100%)`,
      }}
    />
  );
}

function VenueTooltip({ level, side, anchorRef }: { level: MergedPriceLevel; side: 'bid' | 'ask'; anchorRef: React.RefObject<HTMLDivElement | null> }) {
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  React.useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      left: rect.left + 4,
      top: side === 'ask' ? rect.bottom + 4 : rect.top - 4,
    });
  }, [anchorRef, side]);

  if (!pos) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed z-[9999] bg-surface-3 border border-border-light rounded-md px-2.5 py-2 shadow-lg pointer-events-none whitespace-nowrap"
      style={{
        left: pos.left,
        ...(side === 'ask' ? { top: pos.top } : { bottom: window.innerHeight - pos.top }),
      }}
    >
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
    </div>,
    document.body
  );
}

function OrderRow({
  level,
  side,
  barWidth,
  cumUsd,
  hoveredRow,
  setHoveredRow,
}: {
  level: MergedPriceLevel;
  side: 'bid' | 'ask';
  barWidth: number;
  cumUsd: number;
  hoveredRow: string | null;
  setHoveredRow: (key: string | null) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const prevSize = useRef(level.totalSize);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevSize.current !== level.totalSize) {
      prevSize.current = level.totalSize;
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 400);
      return () => clearTimeout(id);
    }
  }, [level.totalSize]);

  const rowKey = `${side === 'bid' ? 'b' : 'a'}-${level.price}`;
  const isHovered = hoveredRow === rowKey;
  const priceColor = side === 'bid' ? 'text-bid' : 'text-ask';
  const flashColor = side === 'bid' ? 'rgba(0, 192, 118, 0.15)' : 'rgba(255, 77, 106, 0.15)';

  return (
    <div
      ref={rowRef}
      key={rowKey}
      className="relative h-[22px] flex items-center text-[11px] font-mono cursor-default hover:bg-white/[0.03]"
      style={{
        backgroundColor: flash ? flashColor : undefined,
        transition: flash ? 'none' : 'background-color 400ms ease-out',
      }}
      onMouseEnter={() => setHoveredRow(rowKey)}
      onMouseLeave={() => setHoveredRow(null)}
    >
      <DepthBar level={level} barWidthPct={barWidth} side={side} />
      <div className="relative z-10 grid w-full items-center tabular-nums" style={{ gridTemplateColumns: '52px 1fr 80px' }}>
        <span className={`pl-3 ${priceColor}`}>{(level.price * 100).toFixed(1)}¢</span>
        <span className="text-right text-foreground">
          {fmtCompact(level.totalSize)}
        </span>
        <span className="text-right pr-3 text-muted-light">
          {fmtCompact(cumUsd, '$')}
        </span>
      </div>
      {isHovered && <VenueTooltip level={level} side={side} anchorRef={rowRef} />}
    </div>
  );
}

function flipLevels(levels: MergedPriceLevel[]): MergedPriceLevel[] {
  return levels.map((l) => ({
    ...l,
    price: asProbability(1 - l.price),
    venues: l.venues.map((v) => ({ ...v })),
  }));
}

type VenueFilter = 'all' | 'polymarket' | 'kalshi';

function filterByVenue(levels: MergedPriceLevel[], venue: VenueFilter): MergedPriceLevel[] {
  if (venue === 'all') return levels;
  return levels
    .map((l) => {
      const filtered = l.venues.filter((v) => v.venue === venue);
      if (filtered.length === 0) return null;
      return {
        ...l,
        totalSize: asDollars(filtered.reduce((sum, v) => sum + v.size, 0)),
        venues: filtered,
      };
    })
    .filter((l): l is MergedPriceLevel => l !== null);
}

export function OrderBookPanel() {
  const mergedBook = useOrderBookStore((s) => s.mergedBook);
  const selectedOutcome = useQuoteStore((s) => s.selectedOutcome);
  const [tickSize, setTickSize] = useState(0.1);
  const [venueFilter, setVenueFilter] = useState<VenueFilter>('all');
  const tickOptions = venueFilter === 'kalshi' ? TICK_OPTIONS_KALSHI : TICK_OPTIONS_ALL;
  const [tickDropdownOpen, setTickDropdownOpen] = useState(false);
  const [venueDropdownOpen, setVenueDropdownOpen] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const tickDropdownRef = useRef<HTMLDivElement>(null);
  const venueDropdownRef = useRef<HTMLDivElement>(null);
  const asksScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tickDropdownRef.current && !tickDropdownRef.current.contains(e.target as Node)) {
        setTickDropdownOpen(false);
      }
      if (venueDropdownRef.current && !venueDropdownRef.current.contains(e.target as Node)) {
        setVenueDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isNo = selectedOutcome === 'no';

  const rawAsks = useMemo(() => {
    const source = isNo
      ? flipLevels(mergedBook.bids).sort((a, b) => a.price - b.price)
      : mergedBook.asks;
    return filterByVenue(source, venueFilter);
  }, [mergedBook.bids, mergedBook.asks, isNo, venueFilter]);

  const rawBids = useMemo(() => {
    const source = isNo
      ? flipLevels(mergedBook.asks).sort((a, b) => b.price - a.price)
      : mergedBook.bids;
    return filterByVenue(source, venueFilter);
  }, [mergedBook.bids, mergedBook.asks, isNo, venueFilter]);

  const bestBid = rawBids.length > 0 ? rawBids[0].price : 0;
  const bestAsk = useMemo(() => {
    for (const l of rawAsks) {
      if (l.price > bestBid) return l.price;
    }
    return 1;
  }, [rawAsks, bestBid]);

  const allAsksGrouped = useMemo(() => {
    const filtered = rawAsks.filter((l) => l.price >= bestAsk);
    return groupByTick(filtered, tickSize, 'ask');
  }, [rawAsks, tickSize, bestAsk]);

  const allBidsGrouped = useMemo(() => {
    return groupByTick(rawBids, tickSize, 'bid');
  }, [rawBids, tickSize]);

  const asks = useMemo(() => [...allAsksGrouped].reverse(), [allAsksGrouped]);
  const bids = useMemo(() => allBidsGrouped, [allBidsGrouped]);

  const hasAutoScrolled = useRef(false);
  const askUpdateCount = useRef(0);

  useEffect(() => {
    hasAutoScrolled.current = false;
    askUpdateCount.current = 0;
  }, [isNo]);

  useEffect(() => {
    if (hasAutoScrolled.current || asks.length === 0) return;
    askUpdateCount.current++;
    if (askUpdateCount.current >= 2 && asksScrollRef.current) {
      asksScrollRef.current.scrollTop = asksScrollRef.current.scrollHeight;
      hasAutoScrolled.current = true;
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

  const totalAskDepth = useMemo(() => {
    let total = 0;
    for (const l of allAsksGrouped) total += l.totalSize;
    return Math.max(total, 1);
  }, [allAsksGrouped]);

  const totalBidDepth = useMemo(() => {
    let total = 0;
    for (const l of allBidsGrouped) total += l.totalSize;
    return Math.max(total, 1);
  }, [allBidsGrouped]);

  const askCumUsd = useMemo(() => {
    const cum: number[] = new Array(asks.length);
    let total = 0;
    for (let i = asks.length - 1; i >= 0; i--) {
      total += asks[i].totalSize * asks[i].price;
      cum[i] = total;
    }
    return cum;
  }, [asks]);

  const bidCumUsd = useMemo(() => {
    const cum: number[] = new Array(bids.length);
    let total = 0;
    for (let i = 0; i < bids.length; i++) {
      total += bids[i].totalSize * bids[i].price;
      cum[i] = total;
    }
    return cum;
  }, [bids]);

  const filteredAsks = useMemo(
    () => rawAsks.filter((l) => l.price >= bestAsk),
    [rawAsks, bestAsk]
  );
  const bidTotal = useMemo(
    () => rawBids.reduce((sum, l) => sum + l.totalSize, 0),
    [rawBids]
  );
  const askTotal = useMemo(
    () => filteredAsks.reduce((sum, l) => sum + l.totalSize, 0),
    [filteredAsks]
  );
  const bidPct = bidTotal + askTotal > 0 ? Math.round((bidTotal / (bidTotal + askTotal)) * 100) : 50;

  const spreadValue = bestAsk - bestBid;
  const midpoint = (bestAsk + bestBid) / 2;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 h-9 border-b border-border shrink-0">
        <span className="text-[13px] font-medium text-foreground whitespace-nowrap">
          Order Book <span className="text-muted">({isNo ? 'No' : 'Yes'})</span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative" ref={venueDropdownRef}>
            <button
              onClick={() => setVenueDropdownOpen(!venueDropdownOpen)}
              className="flex items-center gap-1 px-2 py-0.5 bg-surface-2 border border-border rounded text-[11px] font-mono text-muted-light cursor-pointer hover:bg-surface-3 transition-colors"
            >
              {venueFilter === 'all' ? 'All' : venueFilter === 'polymarket' ? 'Polymarket' : 'Kalshi'}
              <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {venueDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-surface-2 border border-border rounded shadow-lg z-50 min-w-[80px]">
                {(['all', 'polymarket', 'kalshi'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setVenueFilter(v);
                      setVenueDropdownOpen(false);
                      if (v === 'kalshi' && tickSize < 1) setTickSize(1);
                    }}
                    className={`block w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors ${
                      v === venueFilter ? 'text-foreground bg-surface-3' : 'text-muted-light hover:bg-surface-3'
                    }`}
                  >
                    {v === 'all' ? 'All' : v === 'polymarket' ? 'Polymarket' : 'Kalshi'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative" ref={tickDropdownRef}>
            <button
              onClick={() => setTickDropdownOpen(!tickDropdownOpen)}
              className="flex items-center gap-1 px-2 py-0.5 bg-surface-2 border border-border rounded text-[11px] font-mono text-muted-light cursor-pointer hover:bg-surface-3 transition-colors"
            >
              {tickSize}¢
              <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {tickDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-surface-2 border border-border rounded shadow-lg z-50 min-w-[60px]">
                {tickOptions.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTickSize(t); setTickDropdownOpen(false); }}
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

      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0">
        <span className="text-[11px] font-mono text-bid">B {bidPct}%</span>
        <div className="flex-1 flex h-[4px] rounded-full overflow-hidden">
          <div className="bg-bid h-full transition-all" style={{ width: `${bidPct}%` }} />
          <div className="bg-ask h-full flex-1" />
        </div>
        <span className="text-[11px] font-mono text-ask">{100 - bidPct}% S</span>
      </div>

      <div
        className="grid px-3 py-1 items-center text-[10px] font-mono text-muted border-b border-border shrink-0"
        style={{ gridTemplateColumns: '52px 1fr 80px' }}
      >
        <span>Price (¢)</span>
        <span className="text-right">Shares</span>
        <span className="text-right">Total (USD)</span>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {asks.length === 0 && bids.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted text-[11px] font-mono">
            Waiting for data…
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col justify-end overflow-hidden">
              <div ref={asksScrollRef} className="overflow-y-auto">
                {asks.map((level, i) => (
                  <OrderRow
                    key={`a-${level.price}`}
                    level={level}
                    side="ask"
                    barWidth={Math.min(((askCumulatives[i] ?? 0) / totalAskDepth) * 100, 100)}
                    cumUsd={askCumUsd[i] ?? 0}
                    hoveredRow={hoveredRow}
                    setHoveredRow={setHoveredRow}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-3 h-6 border-y border-border bg-surface-2 shrink-0">
              <span className="text-[11px] font-mono text-muted">Spread</span>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                {bestBid > 0 && bestAsk < 1 && (
                  <>
                    <span className="text-muted-light">
                      {(spreadValue * 100).toFixed(1)}¢
                    </span>
                    {midpoint > 0 && (
                      <span className="text-muted">
                        {((spreadValue / midpoint) * 100).toFixed(3)}%
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {bids.map((level, i) => (
                <OrderRow
                  key={`b-${level.price}`}
                  level={level}
                  side="bid"
                  barWidth={Math.min(((bidCumulatives[i] ?? 0) / totalBidDepth) * 100, 100)}
                  cumUsd={bidCumUsd[i] ?? 0}
                  hoveredRow={hoveredRow}
                  setHoveredRow={setHoveredRow}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
