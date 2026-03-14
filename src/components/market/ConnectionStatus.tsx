'use client';

import { useConnectionHealth } from '@/hooks/useConnectionHealth';
import { VENUE_LABELS } from '@/domain/market/constants';
import { VenueId, ConnectionState } from '@/domain/orderbook/types';

function StatusDot({ state }: { state: ConnectionState }) {
  const config: Record<ConnectionState['status'], { color: string; pulse: boolean }> = {
    connected: { color: 'bg-bid', pulse: false },
    connecting: { color: 'bg-yellow-500', pulse: true },
    disconnected: { color: 'bg-muted', pulse: false },
    error: { color: 'bg-ask', pulse: true },
  };

  const { color, pulse } = config[state.status];

  return (
    <span className="relative flex h-1.5 w-1.5">
      {pulse && (
        <span className={`absolute inset-0 rounded-full ${color} animate-ping opacity-75`} />
      )}
      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${color}`} />
    </span>
  );
}

export function ConnectionStatus() {
  const connections = useConnectionHealth();

  return (
    <div className="flex items-center gap-3 shrink-0">
      {(Object.keys(connections) as VenueId[]).map((venue) => (
        <div key={venue} className="flex items-center gap-1.5">
          <StatusDot state={connections[venue].state} />
          <span className="text-[11px] font-mono text-muted">
            {VENUE_LABELS[venue]}
          </span>
        </div>
      ))}
    </div>
  );
}
