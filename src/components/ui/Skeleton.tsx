'use client';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-surface-2 rounded ${className}`}
    />
  );
}

export function ChartSkeleton() {
  return (
    <div className="h-full w-full animate-pulse" style={{ backgroundColor: '#131316' }} />
  );
}
