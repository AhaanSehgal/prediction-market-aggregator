'use client';

import { VenueStatus, NetworkFooter } from '@/components/market/ConnectionStatus';
import { useQuoteStore } from '@/stores/quote-store';
import { useMarketPrice } from '@/hooks/useMarketPrice';
import { useMarketStats, formatStats } from '@/hooks/useMarketStats';
import { DEFAULT_MARKET } from '@/domain/market/constants';
import { LiveTitle } from './LiveTitle';
import { Skeleton } from '@/components/ui/Skeleton';

const NAV_LINKS = ['Discover', 'Portfolio', 'Wallet Tracker', 'Leaderboard', 'Watchlist', 'Referrals'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const selectedOutcome = useQuoteStore((s) => s.selectedOutcome);
  const setSelectedOutcome = useQuoteStore((s) => s.setSelectedOutcome);
  const yesPrice = useMarketPrice();
  const noPrice = yesPrice !== null ? 1 - yesPrice : null;
  const stats = useMarketStats();
  const s = formatStats(stats);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <LiveTitle />
      {/* Primary nav bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[15px]"></span>
            <span className="text-base font-semibold tracking-tight">
              <span className="text-white font-bold">Galactic.pro</span>
              <span className="text-muted-light ml-0.5 text-xs font-normal"></span>
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-2">
            {NAV_LINKS.map((link) => (
              <button
                key={link}
                className="px-3 py-1.5 text-[13px] text-muted-light hover:text-foreground transition-colors rounded-md hover:bg-surface-2"
              >
                {link}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border rounded-md w-52">
            <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-[12px] text-muted">Search</span>
            <span className="ml-auto text-[10px] text-muted border border-border-light rounded px-1 py-0.5 font-mono">K</span>
          </div>

          {/* Sign In */}
          <button className="px-4 py-1.5 text-[13px] text-foreground bg-surface-2 border border-border-light rounded-md hover:bg-surface-3 transition-colors">
            Sign In
          </button>
        </div>
      </header>

      {/* Market sub-header */}
      <div className="flex items-center gap-5 px-6 py-3 border-b border-border bg-surface shrink-0 overflow-x-auto">
        {/* Star + Market title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button className="text-muted hover:text-foreground transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
          <span className="text-[13px] text-foreground font-medium truncate max-w-sm">
            {DEFAULT_MARKET.title}
          </span>
        </div>

        {/* YES/NO pills */}
        {yesPrice !== null && noPrice !== null ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSelectedOutcome('yes')}
              className={`inline-flex items-center px-4 py-1.5 text-[12px] font-mono font-semibold rounded-md transition-all ${
                selectedOutcome === 'yes'
                  ? 'bg-bid text-white shadow-sm'
                  : 'bg-bid/10 text-bid border border-bid/25 hover:bg-bid/20'
              }`}
            >
              YES {(yesPrice * 100).toFixed(1)}¢
            </button>
            <button
              onClick={() => setSelectedOutcome('no')}
              className={`inline-flex items-center px-4 py-1.5 text-[12px] font-mono font-semibold rounded-md transition-all ${
                selectedOutcome === 'no'
                  ? 'bg-ask text-white shadow-sm'
                  : 'bg-ask/10 text-ask border border-ask/25 hover:bg-ask/20'
              }`}
            >
              NO {(noPrice * 100).toFixed(1)}¢
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="w-[88px] h-[30px] rounded-md" />
            <Skeleton className="w-[88px] h-[30px] rounded-md" />
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-6 bg-border shrink-0" />

        {/* Market stats */}
        {yesPrice !== null ? (
          <div className="hidden lg:flex items-center gap-8 text-[11px] font-mono shrink-0">
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-muted text-[10px]">Expires</span>
              <span className="text-muted-light">{s.expires}</span>
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-muted text-[10px]">24h Change</span>
              <span className={s.change24hPositive ? 'text-bid' : 'text-ask'}>{s.change24h}</span>
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-muted text-[10px]">24h Volume</span>
              <span className="text-muted-light">{s.volume24h}</span>
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-muted text-[10px]">Total Volume</span>
              <span className="text-muted-light">{s.totalVolume}</span>
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-muted text-[10px]">Liquidity</span>
              <span className="text-muted-light">{s.liquidity}</span>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-8 shrink-0">
            {['Expires', '24h Change', '24h Volume', 'Total Volume', 'Liquidity'].map((label) => (
              <div key={label} className="flex flex-col items-start gap-1">
                <span className="text-muted text-[10px] font-mono">{label}</span>
                <Skeleton className="w-14 h-3.5 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="hidden lg:block w-px h-6 bg-border shrink-0" />

        {/* Venue connection status */}
        <VenueStatus />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>

      {/* Footer — network health */}
      <NetworkFooter />
    </div>
  );
}
