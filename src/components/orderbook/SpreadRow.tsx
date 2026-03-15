import React from 'react';

interface SpreadRowProps {
  bestBid: number;
  bestAsk: number;
  spreadValue: number;
  midpoint: number;
}

export function SpreadRow({ bestBid, bestAsk, spreadValue, midpoint }: SpreadRowProps) {
  return (
    <div className="flex items-center justify-between px-3 h-6 border-y border-border bg-surface-2 shrink-0">
      <span className="text-[11px] font-mono text-muted">Spread</span>
      <div className="flex items-center gap-2 text-[11px] font-mono">
        {bestBid > 0 && bestAsk < 1 && (
          <>
            <span className="text-muted-light">
              {(spreadValue * 100).toFixed(1)}¢
            </span>
            {midpoint > 0 && (
              <span className="text-muted">
                {((spreadValue / midpoint) * 100).toFixed(3)}%
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
