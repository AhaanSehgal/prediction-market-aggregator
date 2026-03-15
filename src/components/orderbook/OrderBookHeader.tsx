import React, { useRef, useState, useEffect } from 'react';
import { VenueFilter } from '@/domain/orderbook/transforms';

interface OrderBookHeaderProps {
  isNo: boolean;
  venueFilter: VenueFilter;
  setVenueFilter: (v: VenueFilter) => void;
  tickSize: number;
  setTickSize: (t: number) => void;
  tickOptions: readonly number[];
}

export function OrderBookHeader({
  isNo,
  venueFilter,
  setVenueFilter,
  tickSize,
  setTickSize,
  tickOptions,
}: OrderBookHeaderProps) {
  const [tickDropdownOpen, setTickDropdownOpen] = useState(false);
  const [venueDropdownOpen, setVenueDropdownOpen] = useState(false);
  const tickDropdownRef = useRef<HTMLDivElement>(null);
  const venueDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tickDropdownRef.current && !tickDropdownRef.current.contains(e.target as Node)) {
        setTickDropdownOpen(false);
      }
      if (venueDropdownRef.current && !venueDropdownRef.current.contains(e.target as Node)) {
        setVenueDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const venueLabel =
    venueFilter === 'all' ? 'All' : venueFilter === 'polymarket' ? 'Polymarket' : 'Kalshi';

  return (
    <div className="flex items-center justify-between px-3 h-9 border-b border-border shrink-0">
      <span className="text-[13px] font-medium text-foreground whitespace-nowrap">
        Order Book <span className="text-muted">({isNo ? 'No' : 'Yes'})</span>
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="relative" ref={venueDropdownRef}>
          <button
            onClick={() => setVenueDropdownOpen(!venueDropdownOpen)}
            className="flex items-center gap-1 px-2 py-0.5 bg-surface-2 border border-border rounded text-[11px] font-mono text-muted-light cursor-pointer hover:bg-surface-3 transition-colors"
          >
            {venueLabel}
            <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {venueDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 bg-surface-2 border border-border rounded shadow-lg z-50 min-w-[80px]">
              {(['all', 'polymarket', 'kalshi'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setVenueFilter(v);
                    setVenueDropdownOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors ${
                    v === venueFilter ? 'text-foreground bg-surface-3' : 'text-muted-light hover:bg-surface-3'
                  }`}
                >
                  {v === 'all' ? 'All' : v === 'polymarket' ? 'Polymarket' : 'Kalshi'}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative" ref={tickDropdownRef}>
          <button
            onClick={() => setTickDropdownOpen(!tickDropdownOpen)}
            className="flex items-center gap-1 px-2 py-0.5 bg-surface-2 border border-border rounded text-[11px] font-mono text-muted-light cursor-pointer hover:bg-surface-3 transition-colors"
          >
            {tickSize}¢
            <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {tickDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 bg-surface-2 border border-border rounded shadow-lg z-50 min-w-[60px]">
              {tickOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTickSize(t); setTickDropdownOpen(false); }}
                  className={`block w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors ${
                    t === tickSize ? 'text-foreground bg-surface-3' : 'text-muted-light hover:bg-surface-3'
                  }`}
                >
                  {t}¢
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
