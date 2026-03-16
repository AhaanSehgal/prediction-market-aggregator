import React from 'react';

interface SpreadRowProps {
  bestBid: number;
  bestAsk: number;
  spreadValue: number;
  midpoint: number;
}

export function SpreadRow({ bestBid, bestAsk, spreadValue, midpoint }: SpreadRowProps) {
  const isCrossed = spreadValue < 0;

  return (
    <div className={`flex items-center justify-between px-3 h-6 border-y border-border shrink-0 ${isCrossed ? 'bg-yellow-400/10' : 'bg-surface-2'}`}>
      <span className="text-[11px] font-mono text-muted">
        {isCrossed ? 'Crossed' : 'Spread'}
      </span>
      <div className="flex items-center gap-2 text-[11px] font-mono">
        {bestBid > 0 && bestAsk < 1 && (
          <>
            <span className={isCrossed ? 'text-yellow-400 font-medium' : 'text-muted-light'}>
              {isCrossed ? '' : ''}{(spreadValue * 100).toFixed(1)}¢
            </span>
            {midpoint > 0 && (
              <span className={isCrossed ? 'text-yellow-400/70' : 'text-muted'}>
                {((spreadValue / midpoint) * 100).toFixed(3)}%
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
