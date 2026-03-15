import React from 'react';

interface BalanceBarProps {
  bidPct: number;
}

export function BalanceBar({ bidPct }: BalanceBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0">
      <span className="text-[11px] font-mono text-bid">B {bidPct}%</span>
      <div className="flex-1 flex h-[4px] rounded-full overflow-hidden">
        <div className="bg-bid h-full transition-all" style={{ width: `${bidPct}%` }} />
        <div className="bg-ask h-full flex-1" />
      </div>
      <span className="text-[11px] font-mono text-ask">{100 - bidPct}% S</span>
    </div>
  );
}
