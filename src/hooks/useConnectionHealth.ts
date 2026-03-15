'use client';

import { useOrderBookStore } from '@/stores/orderbook-store';
import { VenueConnection, VenueId } from '@/domain/orderbook/types';

export function useConnectionHealth(): Record<VenueId, VenueConnection> {
  return useOrderBookStore((s) => s.connections);
}

export function useIsAnyVenueConnected(): boolean {
  const connections = useOrderBookStore((s) => s.connections);
  return Object.values(connections).some(
    (c) => c.state.status === 'connected'
  );
}

export function useAreAllVenuesConnected(): boolean {
  const connections = useOrderBookStore((s) => s.connections);
  return Object.values(connections).every(
    (c) => c.state.status === 'connected'
  );
}
