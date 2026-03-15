'use client';

import React, { useState, useMemo } from 'react';
import { useQuoteStore } from '@/stores/quote-store';
import { useOrderBookStore } from '@/stores/orderbook-store';
import { calculateQuote } from '@/domain/orderbook/quote-engine';
import { useMarketPrice } from '@/hooks/useMarketPrice';
import { useMarketStats } from '@/hooks/useMarketStats';
import { VENUE_COLORS, VENUE_LABELS } from '@/domain/market/constants';
import { MergedOrderBook, MergedPriceLevel, asProbability, asDollars } from '@/domain/orderbook/types';
import { Skeleton } from '@/components/ui/Skeleton';

/** Remove crossed levels and distant stale orders from a merged book */
function uncrossBook(book: MergedOrderBook): MergedOrderBook {
  const MAX_DISTANCE = 0.15; // 15¢ from best bid/ask
  const bestBid = book.bids.length > 0 ? book.bids[0].price : 0;
  const uncrossedAsks = book.asks.filter((l) => l.price > bestBid);
  const bestAsk = uncrossedAsks.length > 0 ? uncrossedAsks[0].price : null;

  // Filter out distant stale limit orders
  const cleanAsks = bestAsk !== null
    ? uncrossedAsks.filter((l) => l.price <= bestAsk + MAX_DISTANCE)
    : uncrossedAsks;
  const cleanBids = bestBid > 0
    ? book.bids.filter((l) => l.price >= bestBid - MAX_DISTANCE)
    : book.bids;

  return {
    bids: cleanBids,
    asks: cleanAsks,
    bestBid: bestBid > 0 ? asProbability(bestBid) : null,
    bestAsk: bestAsk !== null ? asProbability(bestAsk) : null,
    spread: bestAsk !== null && bestBid > 0 ? bestAsk - bestBid : null,
    midpoint: bestAsk !== null && bestBid > 0 ? asProbability((bestAsk + bestBid) / 2) : null,
  };
}

/** Flip a merged book for NO outcome: bids↔asks, prices become 1-price */
function flipBook(book: MergedOrderBook): MergedOrderBook {
  const flipLevels = (levels: MergedPriceLevel[]): MergedPriceLevel[] =>
    levels.map((l) => ({
      ...l,
      price: asProbability(1 - l.price),
      venues: l.venues.map((v) => ({ ...v })),
    }));

  const flippedBids = flipLevels(book.asks).sort((a, b) => b.price - a.price);
  const flippedAsks = flipLevels(book.bids).sort((a, b) => a.price - b.price);

  return uncrossBook({
    ...book,
    bids: flippedBids,
    asks: flippedAsks,
    bestBid: null,
    bestAsk: null,
    spread: null,
    midpoint: null,
  });
}

const QUICK_AMOUNTS = [10, 50, 200, 1000];

export function QuotePanel() {
  const selectedOutcome = useQuoteStore((s) => s.selectedOutcome);
  const side = useQuoteStore((s) => s.side);
  const setSide = useQuoteStore((s) => s.setSide);
  const mergedBook = useOrderBookStore((s) => s.mergedBook);
  const yesPrice = useMarketPrice();
  const stats = useMarketStats();

  const [inputValue, setInputValue] = useState('');
  const inputAmount = parseFloat(inputValue) || 0;
  const isBuy = side === 'buy';

  const isNo = selectedOutcome === 'no';
  const outcomeLabel = isNo ? 'No' : 'Yes';

  // Current price for this outcome
  const currentPrice = useMemo(() => {
    if (yesPrice === null) return null;
    return isNo ? 1 - yesPrice : yesPrice;
  }, [yesPrice, isNo]);

  // Get the right book orientation for this outcome, with crossed levels removed
  const effectiveBook = useMemo(() => {
    if (!isNo) return uncrossBook(mergedBook);
    return flipBook(mergedBook);
  }, [mergedBook, isNo]);

  // Calculate quote — buy uses dollars, sell uses shares
  const quote = useMemo(() => {
    if (inputAmount <= 0) return null;
    return calculateQuote(effectiveBook, inputAmount, side);
  }, [effectiveBook, inputAmount, side]);

  const handleQuickAmount = (amt: number) => {
    const current = parseFloat(inputValue) || 0;
    setInputValue(String(current + amt));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty, digits, and one decimal point
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setInputValue(val);
    }
  };

  // Buy: payout = shares (each pays $1 if you win), profit = shares - cost
  // Sell: you receive = totalCost (dollars from selling shares)
  const potentialPayout = quote ? (isBuy ? quote.totalShares : quote.totalCost) : 0;
  const potentialProfit = quote ? (isBuy ? quote.totalShares - quote.totalCost : 0) : 0;

  const resolvesDate = new Date(stats.expiresAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Buy / Sell tabs */}
      <div className="grid grid-cols-2 border-b border-border shrink-0">
        <button
          onClick={() => setSide('buy')}
          className={`py-2.5 text-[13px] font-medium text-center transition-colors ${
            side === 'buy'
              ? 'text-bid border-b-2 border-bid'
              : 'text-muted hover:text-muted-light'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`py-2.5 text-[13px] font-medium text-center transition-colors ${
            side === 'sell'
              ? 'text-ask border-b-2 border-ask'
              : 'text-muted hover:text-muted-light'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Outcome indicator */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-[13px] text-muted-light">Outcome</span>
        <span className={`text-[13px] font-medium ${isNo ? 'text-ask' : 'text-bid'}`}>
          {outcomeLabel}
          {currentPrice !== null ? (
            <span className="text-muted ml-1.5 font-mono text-[12px]">
              {(currentPrice * 100).toFixed(1)}¢
            </span>
          ) : (
            <Skeleton className="inline-block w-10 h-3.5 ml-1.5 align-middle" />
          )}
        </span>
      </div>

      {/* Amount input */}
      <div className="px-3 py-2.5 border-b border-border shrink-0">
        <label className="text-[12px] text-muted mb-1.5 block">
          {isBuy ? 'Amount (USD)' : 'Shares to sell'}
        </label>
        <div className="flex items-center gap-2 bg-surface-2 border border-border-light rounded-lg px-3 py-2.5">
          {isBuy && <span className="text-[14px] text-muted">$</span>}
          <input
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={isBuy ? '0.00' : '0'}
            className="flex-1 bg-transparent text-[14px] text-foreground font-mono outline-none placeholder:text-muted"
          />
          {!isBuy && <span className="text-[14px] text-muted">shares</span>}
        </div>
      </div>

      {/* Quick amounts */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border shrink-0">
        {QUICK_AMOUNTS.map((amt) => (
          <button
            key={amt}
            onClick={() => handleQuickAmount(amt)}
            className="px-3 py-1.5 text-[12px] font-mono text-muted-light bg-surface-2 border border-border rounded-lg hover:bg-surface-3 transition-colors"
          >
            {isBuy ? `+$${amt}` : `+${amt}`}
          </button>
        ))}
      </div>

      {/* Quote result */}
      {quote && quote.totalShares > 0 ? (
        <>
          {/* Fill details */}
          <div className="px-3 py-2.5 border-b border-border shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-light">
                {isBuy ? 'Shares received' : 'You receive'}
              </span>
              <span className="text-[13px] text-foreground font-mono font-medium">
                {isBuy
                  ? quote.totalShares.toLocaleString('en-US', { maximumFractionDigits: 2 })
                  : `$${quote.totalCost.toFixed(2)}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-light">Avg price</span>
              <span className="text-[13px] text-foreground font-mono">
                {(quote.averagePrice * 100).toFixed(2)}¢
              </span>
            </div>
            {quote.priceImpact > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-light">Price impact</span>
                <span className="text-[13px] text-ask font-mono">
                  {(quote.priceImpact * 100).toFixed(2)}¢
                </span>
              </div>
            )}
            {quote.remainingAmount > 0.01 && (
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-light">Unfilled</span>
                <span className="text-[13px] text-ask font-mono">
                  ${quote.remainingAmount.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Venue breakdown */}
          {quote.venueSummaries.length > 0 && (
            <div className="px-3 py-2.5 border-b border-border shrink-0">
              <span className="text-[11px] text-muted uppercase tracking-wide mb-2 block">
                Fill Split
              </span>
              {/* Bar */}
              <div className="flex h-[6px] rounded-full overflow-hidden mb-2">
                {quote.venueSummaries.map((vs) => (
                  <div
                    key={vs.venue}
                    className="h-full"
                    style={{
                      width: `${(vs.totalCost / quote.totalCost) * 100}%`,
                      background: VENUE_COLORS[vs.venue],
                    }}
                  />
                ))}
              </div>
              {/* Details */}
              {quote.venueSummaries.map((vs) => (
                <div key={vs.venue} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-[8px] h-[8px] rounded-sm"
                      style={{ background: VENUE_COLORS[vs.venue] }}
                    />
                    <span className="text-[12px] text-muted-light">{VENUE_LABELS[vs.venue]}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[12px] font-mono">
                    <span className="text-foreground">
                      {vs.totalShares.toLocaleString('en-US', { maximumFractionDigits: 2 })} shares
                    </span>
                    <span className="text-muted">
                      ${vs.totalCost.toFixed(2)}
                    </span>
                    <span className="text-muted">
                      @{(vs.averagePrice * 100).toFixed(1)}¢
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : inputAmount > 0 ? (
        <div className="px-3 py-4 border-b border-border text-center shrink-0">
          <span className="text-[12px] text-muted font-mono">No liquidity available</span>
        </div>
      ) : null}

      {/* Summary */}
      <div className="px-3 py-2.5 space-y-2 border-b border-border shrink-0">
        {isBuy ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-light">If you win</span>
              <span className={`text-[13px] font-mono font-medium ${potentialPayout > 0 ? 'text-bid' : 'text-muted'}`}>
                {quote && quote.totalShares > 0 ? `$${potentialPayout.toFixed(2)}` : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-light">Total</span>
              <span className="text-[13px] text-foreground font-mono">
                {quote && quote.totalCost > 0 ? `$${quote.totalCost.toFixed(2)}` : '--'}
              </span>
            </div>
            {quote && potentialProfit > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-light">Potential profit</span>
                <span className="text-[13px] text-bid font-mono font-medium">
                  +${potentialProfit.toFixed(2)} ({((potentialProfit / quote.totalCost) * 100).toFixed(0)}%)
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-light">You&apos;ll receive</span>
              <span className={`text-[13px] font-mono font-medium ${quote && quote.totalCost > 0 ? 'text-ask' : 'text-muted'}`}>
                {quote && quote.totalCost > 0 ? `$${quote.totalCost.toFixed(2)}` : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-light">Total shares</span>
              <span className="text-[13px] text-foreground font-mono">
                {quote && quote.totalShares > 0
                  ? quote.totalShares.toLocaleString('en-US', { maximumFractionDigits: 2 })
                  : '--'}
              </span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted-light">Resolves</span>
          <span className="text-[13px] text-foreground font-mono">{resolvesDate}</span>
        </div>
      </div>

      {/* Trade button */}
      <div className="px-3 py-3 shrink-0">
        <button
          disabled={!quote || quote.totalShares <= 0}
          className={`w-full py-3 text-[15px] font-semibold rounded-lg transition-colors ${
            side === 'buy'
              ? 'text-background bg-bid hover:bg-bid-bright disabled:opacity-40 disabled:cursor-not-allowed'
              : 'text-background bg-ask hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {side === 'buy' ? `Buy ${outcomeLabel}` : `Sell ${outcomeLabel}`}
        </button>
      </div>

      {/* Footer */}
      <div className="px-3 pb-3 text-center shrink-0">
        <span className="text-[11px] text-muted">
          Quote only - no real orders placed.{' '}
          <span className="text-accent cursor-pointer hover:underline">Terms</span>
          {' & '}
          <span className="text-accent cursor-pointer hover:underline">Privacy</span>
        </span>
      </div>
    </div>
  );
}
