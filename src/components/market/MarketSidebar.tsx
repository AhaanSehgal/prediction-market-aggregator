'use client';

import { formatCents } from '@/lib/utils';

const CANDIDATES = [
  { name: 'J.D. Vance', change: -0.0, volume: '5.6M', yes: 0.384, no: 0.617, active: true, avatar: '🇺🇸' },
  { name: 'Marco Rubio', change: -0.7, volume: '3.7M', yes: 0.276, no: 0.726, active: false, avatar: '🏛️' },
  { name: 'Ron DeSantis', change: +3.6, volume: '5.3M', yes: 0.029, no: 0.972, active: false, avatar: '🌴' },
  { name: 'Donald Trump', change: -1.2, volume: '12.1M', yes: 0.08, no: 0.92, active: false, avatar: '🗽' },
  { name: 'Vivek Ramaswamy', change: +0.5, volume: '1.8M', yes: 0.03, no: 0.97, active: false, avatar: '📊' },
];

export function MarketSidebar() {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-10 border-b border-border shrink-0">
        <span className="text-[13px] font-medium text-foreground truncate">
          Republican Presidential ...
        </span>
        <button className="flex items-center gap-1 text-[11px] text-muted hover:text-muted-light transition-colors shrink-0">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Unpin
        </button>
      </div>

      {/* All markets label */}
      <div className="px-3 py-2 border-b border-border">
        <div className="text-[12px] text-muted-light">All markets</div>
        <div className="text-[11px] text-muted font-mono">$174.6M Volume</div>
      </div>

      {/* Candidate list */}
      <div className="flex-1 overflow-y-auto">
        {CANDIDATES.map((candidate, i) => (
          <div
            key={i}
            className={`px-3 py-2.5 border-b border-border cursor-pointer transition-colors ${
              candidate.active
                ? 'bg-surface-2'
                : 'hover:bg-surface-2/50'
            }`}
          >
            {/* Candidate name row */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base shrink-0">{candidate.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] text-foreground font-medium truncate">
                    {candidate.name}
                  </span>
                  <svg className="w-3 h-3 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  <span className={candidate.change >= 0 ? 'text-bid' : 'text-ask'}>
                    {candidate.change >= 0 ? '+' : ''}{candidate.change.toFixed(1)}%
                  </span>
                  <span className="text-muted">·</span>
                  <span className="text-muted">${candidate.volume} Volume</span>
                </div>
              </div>
            </div>

            {/* YES/NO buttons */}
            <div className="flex items-center gap-1.5">
              <button className={`flex-1 text-center py-1.5 text-[12px] font-mono font-medium rounded transition-colors ${
                candidate.active
                  ? 'bg-bid/15 text-bid border border-bid/25 hover:bg-bid/20'
                  : 'bg-surface-3 text-muted-light border border-border hover:bg-surface-3/80'
              }`}>
                YES {formatCents(candidate.yes)}
              </button>
              <button className={`flex-1 text-center py-1.5 text-[12px] font-mono font-medium rounded transition-colors ${
                candidate.active
                  ? 'bg-ask/15 text-ask border border-ask/25 hover:bg-ask/20'
                  : 'bg-surface-3 text-muted-light border border-border hover:bg-surface-3/80'
              }`}>
                NO {formatCents(candidate.no)}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
