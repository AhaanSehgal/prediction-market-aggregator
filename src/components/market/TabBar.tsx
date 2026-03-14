'use client';

import React, { useState } from 'react';

const TABS = ['Positions', 'Orders', 'Trades', 'Top Traders', 'Holders', 'News & Events'];

const MOCK_TRADES = [
  { outcome: 'Yes', type: 'Buy', price: 38.4, shares: 120, amount: 46.08, age: '2m', trader: '0x3f...a21b' },
  { outcome: 'Yes', type: 'Sell', price: 38.3, shares: 85, amount: 32.56, age: '5m', trader: '0x7c...e9f4' },
  { outcome: 'No', type: 'Buy', price: 61.7, shares: 200, amount: 123.40, age: '8m', trader: '0x1a...c823' },
  { outcome: 'Yes', type: 'Buy', price: 38.5, shares: 50, amount: 19.25, age: '12m', trader: '0xd5...b1f0' },
  { outcome: 'Yes', type: 'Sell', price: 38.2, shares: 310, amount: 118.42, age: '15m', trader: '0x92...4d67' },
];

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

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0">
          <span className="text-muted">Trader Count</span>
          <span className="text-foreground font-medium">11.0K</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0">
          <span className="text-muted">Total Trades</span>
          <span className="text-foreground font-medium">85.2K</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0">
          <span className="text-muted">Average Trade Size</span>
          <span className="text-foreground font-medium">$44</span>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {['Amount', 'Side', 'Outcome'].map((filter) => (
            <div key={filter} className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-muted-light bg-surface-2 border border-border rounded cursor-pointer hover:bg-surface-3 transition-colors">
              {filter}
              <span className="text-muted-light ml-0.5">All</span>
              <svg className="w-2.5 h-2.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          ))}
          {/* Search */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-2 border border-border rounded">
            <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-[11px] text-muted">Search User</span>
          </div>
        </div>
      </div>

      {/* Table header */}
      <div className="grid items-center px-4 py-1.5 border-b border-border shrink-0 text-[10px] font-mono text-muted uppercase tracking-wider"
        style={{ gridTemplateColumns: '80px 60px 70px 70px 80px 50px 1fr' }}
      >
        <span>Outcome</span>
        <span>Type</span>
        <span className="text-right">Price</span>
        <span className="text-right">Shares</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Age</span>
        <span className="text-right">Trader</span>
      </div>

      {/* Table rows */}
      <div className="flex-1 overflow-y-auto">
        {MOCK_TRADES.map((trade, i) => (
          <div
            key={i}
            className="grid items-center px-4 py-1.5 border-b border-border text-[11px] font-mono hover:bg-surface-2/50 transition-colors cursor-default"
            style={{ gridTemplateColumns: '80px 60px 70px 70px 80px 50px 1fr' }}
          >
            <span className={trade.outcome === 'Yes' ? 'text-bid' : 'text-ask'}>{trade.outcome}</span>
            <span className={trade.type === 'Buy' ? 'text-bid' : 'text-ask'}>{trade.type}</span>
            <span className="text-right text-foreground">{trade.price}¢</span>
            <span className="text-right text-foreground">{trade.shares}</span>
            <span className="text-right text-foreground">${trade.amount.toFixed(2)}</span>
            <span className="text-right text-muted">{trade.age}</span>
            <span className="text-right text-accent">{trade.trader}</span>
          </div>
        ))}
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border shrink-0 bg-surface-2">
        <div className="flex items-center gap-1.5 text-[10px] text-muted font-mono">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Wallet Tracker
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="text-bid">● STABLE</span>
        </div>
      </div>
    </div>
  );
}
