'use client';

import { useOrderBookStore } from '@/stores/orderbook-store';
import { DEFAULT_MARKET, VENUE_COLORS, VENUE_LABELS } from '@/domain/market/constants';
import { VenueId } from '@/domain/orderbook/types';
import { formatCents, formatDollars, formatSpread } from '@/lib/utils';

export function MarketStats() {
  const mergedBook = useOrderBookStore((s) => s.mergedBook);
  const venueBooks = useOrderBookStore((s) => s.venueBooks);
  const connections = useOrderBookStore((s) => s.connections);

  const totalBidLiquidity = mergedBook.bids.reduce(
    (sum, l) => sum + l.totalSize * l.price,
    0
  );
  const totalAskLiquidity = mergedBook.asks.reduce(
    (sum, l) => sum + l.totalSize * l.price,
    0
  );

  return (
    <div className="flex flex-col h-full bg-surface text-xs font-mono">
      {/* Section header */}
      <div className="flex items-center px-3 h-8 border-b border-border bg-surface-2 shrink-0">
        <span className="text-[11px] text-muted-light uppercase tracking-wider">Market Info</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Title */}
        <div>
          <div className="text-[13px] text-white font-sans font-medium leading-tight">
            {DEFAULT_MARKET.title}
          </div>
          <div className="text-[10px] text-muted mt-1">{DEFAULT_MARKET.category}</div>
        </div>

        {/* Outcome prices */}
        <div className="grid grid-cols-2 gap-1">
          {DEFAULT_MARKET.outcomes.map((outcome) => (
            <div
              key={outcome.id}
              className="bg-surface-2 border border-border px-2 py-1.5"
            >
              <div className="text-[10px] text-muted uppercase">{outcome.label}</div>
              <div className={`text-base font-bold ${outcome.id === 'yes' ? 'text-bid' : 'text-ask'}`}>
                {outcome.lastPrice !== null
                  ? formatCents(outcome.lastPrice)
                  : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Key metrics */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-muted uppercase tracking-wider">Key Metrics</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <span className="text-muted">Best Bid</span>
            <span className="text-right text-bid">
              {mergedBook.bestBid !== null ? formatCents(mergedBook.bestBid) : '—'}
            </span>
            <span className="text-muted">Best Ask</span>
            <span className="text-right text-ask">
              {mergedBook.bestAsk !== null ? formatCents(mergedBook.bestAsk) : '—'}
            </span>
            <span className="text-muted">Midpoint</span>
            <span className="text-right text-white">
              {mergedBook.midpoint !== null ? formatCents(mergedBook.midpoint) : '—'}
            </span>
            <span className="text-muted">Spread</span>
            <span className="text-right text-muted-light">
              {mergedBook.spread !== null ? formatSpread(mergedBook.spread) : '—'}
            </span>
          </div>
        </div>

        {/* Liquidity */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-muted uppercase tracking-wider">Liquidity</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <span className="text-muted">Bid depth</span>
            <span className="text-right text-bid">{formatDollars(totalBidLiquidity)}</span>
            <span className="text-muted">Ask depth</span>
            <span className="text-right text-ask">{formatDollars(totalAskLiquidity)}</span>
          </div>

          {/* Bid/Ask balance bar */}
          <div className="flex h-1 rounded-full overflow-hidden bg-surface-2 mt-1">
            <div
              className="bg-bid"
              style={{
                width: `${totalBidLiquidity + totalAskLiquidity > 0
                  ? (totalBidLiquidity / (totalBidLiquidity + totalAskLiquidity)) * 100
                  : 50}%`,
                opacity: 0.6,
              }}
            />
            <div
              className="bg-ask"
              style={{ flex: 1, opacity: 0.6 }}
            />
          </div>
        </div>

        {/* Venue status */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-muted uppercase tracking-wider">Venues</div>
          {(Object.keys(venueBooks) as VenueId[]).map((venue) => {
            const book = venueBooks[venue];
            const conn = connections[venue];
            const levels = book ? book.bids.length + book.asks.length : 0;
            const isConnected = conn.state.status === 'connected';

            return (
              <div key={venue} className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  {!isConnected && conn.state.status !== 'disconnected' && (
                    <span className="absolute inset-0 rounded-full animate-ping opacity-75"
                      style={{ backgroundColor: isConnected ? VENUE_COLORS[venue] : 'var(--ask)' }}
                    />
                  )}
                  <span
                    className="relative inline-flex rounded-full h-1.5 w-1.5"
                    style={{
                      backgroundColor: isConnected
                        ? VENUE_COLORS[venue]
                        : conn.state.status === 'disconnected'
                          ? 'var(--muted)'
                          : 'var(--ask)',
                    }}
                  />
                </span>
                <span className="text-muted-light">{VENUE_LABELS[venue]}</span>
                <span className="ml-auto text-muted">{levels} lvls</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
