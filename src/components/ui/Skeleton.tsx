'use client';

/**
 * Reusable skeleton shimmer block.
 * Pass className for width/height/rounded.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-surface-2 rounded ${className}`}
    />
  );
}

/** Simple flat skeleton for the TradingView chart area */
export function ChartSkeleton() {
  return (
    <div className="h-full w-full animate-pulse" style={{ backgroundColor: '#131316' }} />
  );
}
