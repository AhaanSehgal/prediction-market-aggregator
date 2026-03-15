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

      <div className="flex-1 flex items-center justify-center gap-2.5 px-4">
        <svg className="w-5 h-5 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[13px] text-muted">
          Coming Soon - Live trades, positions, and leaderboard data
        </span>
      </div>
    </div>
  );
}
