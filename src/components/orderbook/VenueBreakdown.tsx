'use client';

import React from 'react';
import { MergedPriceLevel } from '@/domain/orderbook/types';
import { VENUE_COLORS, VENUE_LABELS } from '@/domain/market/constants';
import { formatDollars, formatCents } from '@/lib/utils';

interface VenueBreakdownProps {
  level: MergedPriceLevel;
}

export const VenueBreakdown = React.memo(function VenueBreakdown({
  level,
}: VenueBreakdownProps) {
  return (
    <div className="bg-surface-2 border border-border rounded p-2 text-xs font-mono">
      <div className="text-muted mb-1">
        Price: {formatCents(level.price)} — Total: {formatDollars(level.totalSize)}
      </div>
      <div className="space-y-1">
        {level.venues.map((v) => {
          const pct = level.totalSize > 0 ? (v.size / level.totalSize) * 100 : 0;
          return (
            <div key={v.venue} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: VENUE_COLORS[v.venue] }}
              />
              <span className="text-muted w-20">{VENUE_LABELS[v.venue]}</span>
              <span className="text-foreground">{formatDollars(v.size)}</span>
              <span className="text-muted">({pct.toFixed(0)}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
