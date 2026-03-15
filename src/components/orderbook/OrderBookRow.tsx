'use client';

import React, { useRef, useEffect } from 'react';
import { MergedPriceLevel } from '@/domain/orderbook/types';

interface OrderBookRowProps {
  level: MergedPriceLevel;
  side: 'bid' | 'ask';
  cumulativeSize: number;
  maxCumulativeSize: number;
}

export const OrderBookRow = React.memo(function OrderBookRow({
  level,
  side,
  cumulativeSize,
  maxCumulativeSize,
}: OrderBookRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const prevSizeRef = useRef<number>(level.totalSize);

  useEffect(() => {
    if (prevSizeRef.current !== level.totalSize && rowRef.current) {
      const cls = level.totalSize > prevSizeRef.current ? 'flash-up' : 'flash-down';
      rowRef.current.classList.add(cls);
      const timer = setTimeout(() => rowRef.current?.classList.remove(cls), 500);
      prevSizeRef.current = level.totalSize;
      return () => clearTimeout(timer);
    }
  }, [level.totalSize]);

  const barWidth = maxCumulativeSize > 0
    ? Math.min((cumulativeSize / maxCumulativeSize) * 100, 100)
    : 0;

  const isBid = side === 'bid';
  const priceDisplay = `${(level.price * 100).toFixed(0)}`;
  const totalUsd = level.totalSize * level.price;

  return (
    <div
      ref={rowRef}
      className="relative h-[21px] flex items-center text-[11px] font-mono cursor-default hover:bg-white/[0.03]"
    >
      <div
        className="absolute inset-y-0 right-0 pointer-events-none"
        style={{
          width: `${barWidth}%`,
          background: isBid ? 'var(--bid-bar)' : 'var(--ask-bar)',
        }}
      />

      <div className="relative z-10 grid w-full items-center tabular-nums" style={{ gridTemplateColumns: '48px 1fr 68px' }}>
        <span className={`pl-2 ${isBid ? 'text-bid' : 'text-ask'}`}>
          {priceDisplay}¢
        </span>
        <span className="text-right text-foreground">
          {level.totalSize.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </span>
        <span className="text-right pr-2 text-muted-light">
          ${totalUsd.toLocaleString('en-US', { maximumFractionDigits: 1 })}
        </span>
      </div>
    </div>
  );
});
