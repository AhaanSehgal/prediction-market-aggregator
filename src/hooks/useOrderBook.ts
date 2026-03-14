'use client';

import { useEffect, useRef } from 'react';
import { useOrderBookStore } from '@/stores/orderbook-store';
import { PolymarketSocket } from '@/infrastructure/websocket/PolymarketSocket';
import { KalshiSocket } from '@/infrastructure/websocket/KalshiSocket';
import { fetchPolymarketBook } from '@/infrastructure/api/polymarket';
import { fetchKalshiBook } from '@/infrastructure/api/kalshi';
import { DEFAULT_MARKET } from '@/domain/market/constants';

/**
 * Hook that initializes WebSocket connections to both venues,
 * fetches initial snapshots, and returns the merged order book.
 */
export function useOrderBook() {
  const { mergedBook, updateVenueBook, updateConnectionState } =
    useOrderBookStore();

  const polySocketRef = useRef<PolymarketSocket | null>(null);
  const kalshiSocketRef = useRef<KalshiSocket | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const polyInfo = DEFAULT_MARKET.venueInfo.find(
      (v) => v.venue === 'polymarket'
    );
    const kalshiInfo = DEFAULT_MARKET.venueInfo.find(
      (v) => v.venue === 'kalshi'
    );

    // ─── Polymarket ───────────────────────────────────────────
    if (polyInfo?.tokenId) {
      // Fetch initial snapshot
      fetchPolymarketBook(polyInfo.tokenId)
        .then((book) => updateVenueBook('polymarket', book))
        .catch((err) =>
          console.warn('Failed to fetch Polymarket snapshot:', err)
        );

      // Connect WebSocket for live updates
      const polySocket = new PolymarketSocket(polyInfo.tokenId, {
        onBookUpdate: (book) => updateVenueBook('polymarket', book),
        onStateChange: (state) => updateConnectionState('polymarket', state),
      });
      polySocket.connect();
      polySocketRef.current = polySocket;
    }

    // ─── Kalshi (Mock) ────────────────────────────────────────
    if (kalshiInfo?.ticker) {
      // Fetch initial snapshot
      fetchKalshiBook(kalshiInfo.ticker)
        .then((book) => updateVenueBook('kalshi', book))
        .catch((err) =>
          console.warn('Failed to fetch Kalshi snapshot:', err)
        );

      // Connect mock WebSocket for live updates
      const kalshiSocket = new KalshiSocket(kalshiInfo.ticker, {
        onBookUpdate: (book) => updateVenueBook('kalshi', book),
        onStateChange: (state) => updateConnectionState('kalshi', state),
      });
      kalshiSocket.connect();
      kalshiSocketRef.current = kalshiSocket;
    }

    return () => {
      polySocketRef.current?.disconnect();
      kalshiSocketRef.current?.disconnect();
      initializedRef.current = false;
    };
  }, [updateVenueBook, updateConnectionState]);

  return mergedBook;
}
