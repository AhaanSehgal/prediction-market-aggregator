'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useOrderBookStore } from '@/stores/orderbook-store';
import { useQuoteStore } from '@/stores/quote-store';
import { MergedPriceLevel } from '@/domain/orderbook/types';
import {
  flipLevels,
  filterByVenue,
  groupByTick,
  cumulativeFromEnd,
  cumulativeFromStart,
  cumulativeUsdFromEnd,
  cumulativeUsdFromStart,
  totalSize,
  VenueFilter,
} from '@/domain/orderbook/transforms';

const TICK_OPTIONS_ALL = [0.1, 0.2, 0.5, 1, 2] as const;
const TICK_OPTIONS_KALSHI = [1, 2] as const;

export interface OrderBookViewState {
  // Display data
  asks: MergedPriceLevel[];
  bids: MergedPriceLevel[];
  askCumulatives: number[];
  bidCumulatives: number[];
  askCumUsd: number[];
  bidCumUsd: number[];
  totalAskDepth: number;
  totalBidDepth: number;

  // Spread & balance
  bestBid: number;
  bestAsk: number;
  spreadValue: number;
  midpoint: number;
  bidPct: number;

  // Controls
  isNo: boolean;
  tickSize: number;
  setTickSize: (t: number) => void;
  venueFilter: VenueFilter;
  setVenueFilter: (v: VenueFilter) => void;
  tickOptions: readonly number[];

  // Scroll management
  asksScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function useOrderBookView(): OrderBookViewState {
  const mergedBook = useOrderBookStore((s) => s.mergedBook);
  const selectedOutcome = useQuoteStore((s) => s.selectedOutcome);

  const [tickSize, setTickSize] = useState(0.1);
  const [venueFilter, setVenueFilter] = useState<VenueFilter>('all');
  const asksScrollRef = useRef<HTMLDivElement>(null);

  const isNo = selectedOutcome === 'no';
  const tickOptions = venueFilter === 'kalshi' ? TICK_OPTIONS_KALSHI : TICK_OPTIONS_ALL;

  // Auto-set tick to 1¢ when No + All venues, and enforce Kalshi minimum
  const handleSetVenueFilter = useCallback(
    (v: VenueFilter) => {
      setVenueFilter(v);
      if (v === 'kalshi' && tickSize < 1) setTickSize(1);
    },
    [tickSize]
  );

  // Reset scroll state and auto-set tick when outcome flips
  const hasAutoScrolled = useRef(false);
  const askUpdateCount = useRef(0);

  useEffect(() => {
    hasAutoScrolled.current = false;
    askUpdateCount.current = 0;
    if (isNo && venueFilter === 'all' && tickSize < 1) setTickSize(1);
  }, [isNo]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Derived data (all pure computations via useMemo) ---

  const rawAsks = useMemo(() => {
    const source = isNo
      ? flipLevels(mergedBook.bids).sort((a, b) => a.price - b.price)
      : mergedBook.asks;
    return filterByVenue(source, venueFilter);
  }, [mergedBook.bids, mergedBook.asks, isNo, venueFilter]);

  const rawBids = useMemo(() => {
    const source = isNo
      ? flipLevels(mergedBook.asks).sort((a, b) => b.price - a.price)
      : mergedBook.bids;
    return filterByVenue(source, venueFilter);
  }, [mergedBook.bids, mergedBook.asks, isNo, venueFilter]);

  const bestBid = rawBids.length > 0 ? rawBids[0].price : 0;

  const bestAsk = useMemo(() => {
    for (const l of rawAsks) {
      if (l.price > bestBid) return l.price;
    }
    return 1;
  }, [rawAsks, bestBid]);

  const allAsksGrouped = useMemo(() => {
    const filtered = rawAsks.filter((l) => l.price >= bestAsk);
    return groupByTick(filtered, tickSize, 'ask');
  }, [rawAsks, tickSize, bestAsk]);

  const allBidsGrouped = useMemo(
    () => groupByTick(rawBids, tickSize, 'bid'),
    [rawBids, tickSize]
  );

  const asks = useMemo(() => [...allAsksGrouped].reverse(), [allAsksGrouped]);
  const bids = allBidsGrouped;

  // Auto-scroll asks to bottom on first data load
  useEffect(() => {
    if (hasAutoScrolled.current || asks.length === 0) return;
    askUpdateCount.current++;
    if (askUpdateCount.current >= 2 && asksScrollRef.current) {
      asksScrollRef.current.scrollTop = asksScrollRef.current.scrollHeight;
      hasAutoScrolled.current = true;
    }
  }, [asks]);

  // Cumulatives
  const askCumulatives = useMemo(() => cumulativeFromEnd(asks), [asks]);
  const bidCumulatives = useMemo(() => cumulativeFromStart(bids), [bids]);
  const askCumUsd = useMemo(() => cumulativeUsdFromEnd(asks), [asks]);
  const bidCumUsd = useMemo(() => cumulativeUsdFromStart(bids), [bids]);
  const totalAskDepth = useMemo(() => totalSize(allAsksGrouped), [allAsksGrouped]);
  const totalBidDepth = useMemo(() => totalSize(allBidsGrouped), [allBidsGrouped]);

  // Balance
  const filteredAsks = useMemo(
    () => rawAsks.filter((l) => l.price >= bestAsk),
    [rawAsks, bestAsk]
  );
  const bidTotal = useMemo(
    () => rawBids.reduce((sum, l) => sum + l.totalSize, 0),
    [rawBids]
  );
  const askTotal = useMemo(
    () => filteredAsks.reduce((sum, l) => sum + l.totalSize, 0),
    [filteredAsks]
  );
  const bidPct =
    bidTotal + askTotal > 0
      ? Math.round((bidTotal / (bidTotal + askTotal)) * 100)
      : 50;

  const spreadValue = bestAsk - bestBid;
  const midpoint = (bestAsk + bestBid) / 2;

  return {
    asks,
    bids,
    askCumulatives,
    bidCumulatives,
    askCumUsd,
    bidCumUsd,
    totalAskDepth,
    totalBidDepth,
    bestBid,
    bestAsk,
    spreadValue,
    midpoint,
    bidPct,
    isNo,
    tickSize,
    setTickSize,
    venueFilter,
    setVenueFilter: handleSetVenueFilter,
    tickOptions,
    asksScrollRef,
  };
}
