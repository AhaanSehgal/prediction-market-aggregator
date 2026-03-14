'use client';

import { useOrderBookStore } from '@/stores/orderbook-store';
import { VenueConnection, VenueId } from '@/domain/orderbook/types';

/**
 * Hook for monitoring WebSocket connection status per venue.
 */
export function useConnectionHealth(): Record<VenueId, VenueConnection> {
  return useOrderBookStore((s) => s.connections);
}

/**
 * Returns true if at least one venue is connected.
 */
export function useIsAnyVenueConnected(): boolean {
  const connections = useOrderBookStore((s) => s.connections);
  return Object.values(connections).some(
    (c) => c.state.status === 'connected'
  );
}

/**
 * Returns true if all venues are connected.
 */
export function useAreAllVenuesConnected(): boolean {
  const connections = useOrderBookStore((s) => s.connections);
  return Object.values(connections).every(
    (c) => c.state.status === 'connected'
  );
}
