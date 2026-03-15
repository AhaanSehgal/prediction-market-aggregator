'use client';

import { useConnectionHealth, useAreAllVenuesConnected } from '@/hooks/useConnectionHealth';
import { VENUE_LABELS } from '@/domain/market/constants';
import { VenueId, ConnectionState } from '@/domain/orderbook/types';
import { Skeleton } from '@/components/ui/Skeleton';

const VENUE_LOGOS: Record<VenueId, { src: string; className: string }> = {
  polymarket: { src: '/polymarket-logo.png', className: 'w-3 h-3 rounded-[3px]' },
  kalshi: { src: '/kalshi-logo.png', className: 'w-4 h-4 rounded-[3px] object-contain' },
};

function statusDotColor(state: ConnectionState): string {
  switch (state.status) {
    case 'connected':
      return 'bg-bid';
    case 'connecting':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-ask';
    case 'disconnected':
      return 'bg-muted';
  }
}

function shouldPulse(state: ConnectionState): boolean {
  return state.status === 'connecting' || state.status === 'error';
}

function statusLabel(state: ConnectionState): { text: string; color: string } {
  switch (state.status) {
    case 'connected':
      return { text: 'Live', color: 'text-bid' };
    case 'connecting':
      return { text: 'Connecting', color: 'text-yellow-500' };
    case 'error':
      return { text: 'Error', color: 'text-ask' };
    case 'disconnected':
      return { text: 'Offline', color: 'text-muted' };
  }
}

export function VenueStatus() {
  const connections = useConnectionHealth();
  const venues = Object.keys(connections) as VenueId[];

  const anyEverConnected = venues.some(
    (v) => connections[v].lastMessageAt !== null
  );

  if (!anyEverConnected) {
    return (
      <div className="hidden lg:flex items-center gap-4 shrink-0">
        {venues.map((venue) => (
          <div key={venue} className="flex items-center gap-1.5">
            <Skeleton className="w-3.5 h-3.5 rounded-[3px]" />
            <Skeleton className="w-16 h-3 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="hidden lg:flex items-center gap-4 shrink-0">
      {venues.map((venue) => {
        const conn = connections[venue];
        const dotColor = statusDotColor(conn.state);
        const pulse = shouldPulse(conn.state);
        const label = statusLabel(conn.state);

        return (
          <div key={venue} className="flex items-center gap-1.5">
            <img
              src={VENUE_LOGOS[venue].src}
              alt={VENUE_LABELS[venue]}
              className={`${VENUE_LOGOS[venue].className} shrink-0`}
            />
            <span className="text-[10px] text-muted-light">
              {VENUE_LABELS[venue]}
            </span>
            <span className="relative flex h-1.5 w-1.5">
              {pulse && (
                <span
                  className={`absolute inset-0 rounded-full ${dotColor} animate-ping opacity-75`}
                />
              )}
              <span
                className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor}`}
              />
            </span>
            <span className={`text-[9px] font-mono font-medium ${label.color}`}>
              {label.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function NetworkFooter() {
  const allConnected = useAreAllVenuesConnected();

  return (
    <footer className="flex items-center justify-between px-4 py-1 border-t border-border bg-surface shrink-0">
      <div className="flex items-center gap-2">
        <span className="relative flex h-1.5 w-1.5">
          {!allConnected && (
            <span className="absolute inset-0 rounded-full bg-ask animate-ping opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
              allConnected ? 'bg-bid' : 'bg-ask'
            }`}
          />
        </span>
        <span className={`text-[10px] font-mono ${allConnected ? 'text-muted' : 'text-ask'}`}>
          {allConnected ? 'Stable' : 'Unstable'}
        </span>
      </div>
      <span className="text-[10px] text-muted font-mono">galactic.pro</span>
    </footer>
  );
}
