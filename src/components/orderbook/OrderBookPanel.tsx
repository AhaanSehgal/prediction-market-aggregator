'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { MergedPriceLevel } from '@/domain/orderbook/types';
import { VENUE_COLORS, VENUE_LABELS } from '@/domain/market/constants';
import { useOrderBookView } from '@/hooks/useOrderBookView';
import { OrderBookHeader } from './OrderBookHeader';
import { BalanceBar } from './BalanceBar';
import { SpreadRow } from './SpreadRow';

function fmtCompact(n: number, prefix = ''): string {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 100_000) return `${prefix}${(n / 1_000).toFixed(1)}K`;
  if (n >= 10_000) return `${prefix}${(n / 1_000).toFixed(2)}K`;
  return `${prefix}${n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
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
        {(level.price * 100).toFixed(1)}¢
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
          <div className="border-t border-border mt-1.5 pt-1.5 flex items-center justify-between text-[10px] font-mono">
            <span className="text-muted">Combined</span>
            <span className="text-foreground font-medium">
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

export function OrderBookPanel() {
  const view = useOrderBookView();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <OrderBookHeader
        isNo={view.isNo}
        venueFilter={view.venueFilter}
        setVenueFilter={view.setVenueFilter}
        tickSize={view.tickSize}
        setTickSize={view.setTickSize}
        tickOptions={view.tickOptions}
      />

      <BalanceBar bidPct={view.bidPct} />

      <div
        className="grid px-3 py-1 items-center text-[10px] font-mono text-muted border-b border-border shrink-0"
        style={{ gridTemplateColumns: '52px 1fr 80px' }}
      >
        <span>Price (¢)</span>
        <span className="text-right">Shares</span>
        <span className="text-right">Total (USD)</span>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {view.asks.length === 0 && view.bids.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted text-[11px] font-mono">
            Waiting for data…
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col justify-end overflow-hidden">
              <div ref={view.asksScrollRef} className="overflow-y-auto">
                {view.asks.map((level, i) => (
                  <OrderRow
                    key={`a-${level.price}`}
                    level={level}
                    side="ask"
                    barWidth={Math.min(((view.askCumulatives[i] ?? 0) / view.totalAskDepth) * 100, 100)}
                    cumUsd={view.askCumUsd[i] ?? 0}
                    hoveredRow={hoveredRow}
                    setHoveredRow={setHoveredRow}
                  />
                ))}
              </div>
            </div>

            <SpreadRow
              bestBid={view.bestBid}
              bestAsk={view.bestAsk}
              spreadValue={view.spreadValue}
              midpoint={view.midpoint}
            />

            <div className="flex-1 overflow-y-auto">
              {view.bids.map((level, i) => (
                <OrderRow
                  key={`b-${level.price}`}
                  level={level}
                  side="bid"
                  barWidth={Math.min(((view.bidCumulatives[i] ?? 0) / view.totalBidDepth) * 100, 100)}
                  cumUsd={view.bidCumUsd[i] ?? 0}
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
