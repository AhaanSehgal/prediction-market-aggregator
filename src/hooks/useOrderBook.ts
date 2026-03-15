'use client';

import { useEffect, useRef } from 'react';
import { useOrderBookStore } from '@/stores/orderbook-store';
import { PolymarketSocket } from '@/infrastructure/websocket/PolymarketSocket';
import { KalshiSocket } from '@/infrastructure/websocket/KalshiSocket';
import { fetchPolymarketBook } from '@/infrastructure/api/polymarket';
import { fetchKalshiBook } from '@/infrastructure/api/kalshi';
import { DEFAULT_MARKET } from '@/domain/market/constants';

const POLY_POLL_MS = 5_000;

export function useOrderBook() {
  const { mergedBook, updateVenueBook, updateConnectionState, setLivePrice } =
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

    if (polyInfo?.tokenId) {
      const tokenId = polyInfo.tokenId;

      fetchPolymarketBook(tokenId)
        .then((book) => {
          updateVenueBook('polymarket', book);
          updateConnectionState('polymarket', { status: 'connected', since: Date.now() });
        })
        .catch(() => {});

      const polySocket = new PolymarketSocket(tokenId, {
        onBookUpdate: (book) => updateVenueBook('polymarket', book),
        onStateChange: (state) => updateConnectionState('polymarket', state),
        onPriceChange: (data) => setLivePrice(data.price),
      });
      polySocket.connect();
      polySocketRef.current = polySocket;

      let polyPollFailures = 0;
      polyPollRef.current = setInterval(() => {
        fetchPolymarketBook(tokenId)
          .then((book) => {
            polyPollFailures = 0;
            updateVenueBook('polymarket', book);
          })
          .catch(() => {
            polyPollFailures++;
            if (polyPollFailures >= 3) {
              updateConnectionState('polymarket', {
                status: 'error',
                error: 'Network unreachable',
              });
            }
          });
      }, POLY_POLL_MS);
    }

    if (kalshiInfo?.ticker) {
      fetchKalshiBook(kalshiInfo.ticker)
        .then((book) => updateVenueBook('kalshi', book))
        .catch(() => {});

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
