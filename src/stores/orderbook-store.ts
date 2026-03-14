import { create } from 'zustand';
import {
  NormalizedOrderBook,
  MergedOrderBook,
  VenueConnection,
  VenueId,
  ConnectionState,
} from '@/domain/orderbook/types';
import { mergeOrderBooks, emptyMergedBook } from '@/domain/orderbook/aggregator';

interface OrderBookState {
  // Per-venue raw books
  venueBooks: Record<VenueId, NormalizedOrderBook | null>;

  // Merged (aggregated) book
  mergedBook: MergedOrderBook;

  // Connection status per venue
  connections: Record<VenueId, VenueConnection>;

  // Actions
  updateVenueBook: (venue: VenueId, book: NormalizedOrderBook) => void;
  updateConnectionState: (venue: VenueId, state: ConnectionState) => void;
  clearVenueBook: (venue: VenueId) => void;
}

function remerge(books: Record<VenueId, NormalizedOrderBook | null>): MergedOrderBook {
  const activeBooks = Object.values(books).filter(
    (b): b is NormalizedOrderBook => b !== null
  );
  if (activeBooks.length === 0) return emptyMergedBook();
  return mergeOrderBooks(...activeBooks);
}

export const useOrderBookStore = create<OrderBookState>((set) => ({
  venueBooks: {
    polymarket: null,
    kalshi: null,
  },

  mergedBook: emptyMergedBook(),

  connections: {
    polymarket: {
      venue: 'polymarket',
      state: { status: 'disconnected' },
      lastMessageAt: null,
    },
    kalshi: {
      venue: 'kalshi',
      state: { status: 'disconnected' },
      lastMessageAt: null,
    },
  },

  updateVenueBook: (venue, book) =>
    set((state) => {
      const venueBooks = { ...state.venueBooks, [venue]: book };
      return {
        venueBooks,
        mergedBook: remerge(venueBooks),
        connections: {
          ...state.connections,
          [venue]: {
            ...state.connections[venue],
            lastMessageAt: Date.now(),
          },
        },
      };
    }),

  updateConnectionState: (venue, connectionState) =>
    set((state) => ({
      connections: {
        ...state.connections,
        [venue]: {
          ...state.connections[venue],
          state: connectionState,
        },
      },
    })),

  clearVenueBook: (venue) =>
    set((state) => {
      const venueBooks = { ...state.venueBooks, [venue]: null };
      return {
        venueBooks,
        mergedBook: remerge(venueBooks),
      };
    }),
}));
