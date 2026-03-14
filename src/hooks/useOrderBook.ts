'use client';

import { useEffect, useRef } from 'react';
import { useOrderBookStore } from '@/stores/orderbook-store';
import { PolymarketSocket } from '@/infrastructure/websocket/PolymarketSocket';
import { KalshiSocket } from '@/infrastructure/websocket/KalshiSocket';
import { fetchPolymarketBook } from '@/infrastructure/api/polymarket';
import { fetchKalshiBook } from '@/infrastructure/api/kalshi';
import { DEFAULT_MARKET } from '@/domain/market/constants';

const POLY_POLL_MS = 5_000;  // Poll Polymarket every 5s as fallback
const KALSHI_POLL_MS = 3_000; // Kalshi polls every 3s (handled by KalshiSocket)

/**
 * Hook that initializes connections to both venues,
 * fetches initial snapshots, polls for updates, and feeds the merged order book.
 */
export function useOrderBook() {
  const { mergedBook, updateVenueBook, updateConnectionState } =
    useOrderBookStore();

  const polySocketRef = useRef<PolymarketSocket | null>(null);
  const kalshiSocketRef = useRef<KalshiSocket | null>(null);
  const polyPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
      const tokenId = polyInfo.tokenId;

      // Fetch initial snapshot
      fetchPolymarketBook(tokenId)
        .then((book) => {
          updateVenueBook('polymarket', book);
          updateConnectionState('polymarket', { status: 'connected', since: Date.now() });
        })
        .catch((err) =>
          console.warn('Failed to fetch Polymarket snapshot:', err)
        );

      // Try WebSocket for real-time updates
      const polySocket = new PolymarketSocket(tokenId, {
        onBookUpdate: (book) => updateVenueBook('polymarket', book),
        onStateChange: (state) => updateConnectionState('polymarket', state),
      });
      polySocket.connect();
      polySocketRef.current = polySocket;

      // REST polling fallback — ensures data stays fresh even if WS drops
      polyPollRef.current = setInterval(() => {
        fetchPolymarketBook(tokenId)
          .then((book) => updateVenueBook('polymarket', book))
          .catch(() => {}); // Silent fail, WS or next poll will recover
      }, POLY_POLL_MS);
    }

    // ─── Kalshi (real data via REST polling) ─────────────────
    if (kalshiInfo?.ticker) {
      // Fetch initial snapshot
      fetchKalshiBook(kalshiInfo.ticker)
        .then((book) => updateVenueBook('kalshi', book))
        .catch((err) =>
          console.warn('Failed to fetch Kalshi snapshot:', err)
        );

      // Start polling for live updates
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
      if (polyPollRef.current) clearInterval(polyPollRef.current);
      initializedRef.current = false;
    };
  }, [updateVenueBook, updateConnectionState]);

  return mergedBook;
}
