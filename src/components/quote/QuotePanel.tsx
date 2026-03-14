'use client';

import React, { useState } from 'react';

export function QuotePanel() {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'pro'>('market');

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Buy / Sell tabs */}
      <div className="grid grid-cols-2 border-b border-border shrink-0">
        <button
          onClick={() => setActiveTab('buy')}
          className={`py-2.5 text-[13px] font-medium text-center transition-colors ${
            activeTab === 'buy'
              ? 'text-bid border-b-2 border-bid'
              : 'text-muted hover:text-muted-light'
          }`}
        >
          Buy [Y]
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`py-2.5 text-[13px] font-medium text-center transition-colors ${
            activeTab === 'sell'
              ? 'text-ask border-b-2 border-ask'
              : 'text-muted hover:text-muted-light'
          }`}
        >
          Sell [Y]
        </button>
      </div>

      {/* Market / Limit / Pro */}
      <div className="grid grid-cols-3 border-b border-border shrink-0">
        {(['market', 'limit', 'pro'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`py-2 text-[12px] font-medium text-center transition-colors ${
              orderType === type
                ? 'text-foreground border-b-2 border-foreground'
                : 'text-muted hover:text-muted-light'
            }`}
          >
            {type === 'pro' ? 'Pro ▾' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Fill and Kill (FAK) */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-[12px] text-muted">Fill and Kill (FAK)</span>
        <svg className="w-4 h-4 text-muted cursor-pointer hover:text-muted-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>

      {/* Shares input */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <span className="text-[13px] text-muted-light">Shares</span>
        <span className="text-[12px] text-muted font-mono">Bal: --</span>
      </div>

      <div className="px-3 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2 bg-surface-2 border border-border-light rounded-lg px-3 py-2.5">
          <span className="text-[14px] text-muted">--</span>
          <span className="text-[14px] text-foreground font-medium">Yes</span>
          <span className="ml-auto text-[14px] text-muted font-mono">$0</span>
        </div>
      </div>

      {/* Quick amounts */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border shrink-0">
        {['+$10', '+$50', '+$200', '+$1000'].map((amt) => (
          <button
            key={amt}
            className="px-3 py-1.5 text-[12px] font-mono text-muted-light bg-surface-2 border border-border rounded-lg hover:bg-surface-3 transition-colors"
          >
            {amt}
          </button>
        ))}
        <button className="ml-auto p-1.5 text-muted hover:text-muted-light transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      {/* Percentage slider */}
      <div className="flex items-center gap-3 px-3 py-3 border-b border-border shrink-0">
        <input
          type="range"
          min="0"
          max="100"
          defaultValue="0"
          className="flex-1 h-[3px] bg-surface-3 rounded-full appearance-none cursor-pointer accent-accent"
        />
        <span className="text-[12px] font-mono text-muted w-10 text-right">0 %</span>
      </div>

      {/* Take Profit / Stop Loss */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <span className="text-[13px] text-muted-light">Take Profit / Stop Loss</span>
        <button className="text-[12px] text-accent hover:text-accent/80 transition-colors font-medium">+ Add</button>
      </div>

      {/* Summary */}
      <div className="px-3 py-2 space-y-2 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted-light">If you win</span>
          <span className="text-[13px] text-bid font-mono">--</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted-light">Total</span>
          <span className="text-[13px] text-muted font-mono">--</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted-light">Resolves</span>
          <span className="text-[13px] text-foreground font-mono">November 6, 2028</span>
        </div>
      </div>

      {/* Trade button */}
      <div className="px-3 py-3 shrink-0">
        <button className="w-full py-3 text-[15px] font-semibold text-background bg-bid hover:bg-bid-bright rounded-lg transition-colors">
          Trade
        </button>
      </div>

      {/* Footer */}
      <div className="px-3 pb-3 text-center shrink-0">
        <span className="text-[11px] text-muted">
          By trading, you agree to our{' '}
          <span className="text-accent cursor-pointer hover:underline">Terms</span>
          {' & '}
          <span className="text-accent cursor-pointer hover:underline">Privacy</span>
        </span>
      </div>
    </div>
  );
}
