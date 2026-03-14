'use client';

import React, { useState } from 'react';

const TABS = ['Positions', 'Orders', 'Trades', 'Top Traders', 'Holders', 'News & Events'];

export function TabBar() {
  const [activeTab, setActiveTab] = useState('Trades');

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Tab headers */}
      <div className="flex items-center border-b border-border shrink-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'text-foreground border-b-2 border-accent'
                : 'text-muted hover:text-muted-light'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Coming soon banner */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-2 border border-border">
          <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-[13px] text-muted-light font-medium">Coming Soon</span>
        <span className="text-[11px] text-muted text-center max-w-xs">
          Live trades, positions, and leaderboard data will appear here once connected to on-chain activity.
        </span>
      </div>
    </div>
  );
}
