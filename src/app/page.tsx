'use client';

import { AppShell } from '@/components/layout/AppShell';
import { MarketSidebar } from '@/components/market/MarketSidebar';
import { PriceChart } from '@/components/market/PriceChart';
import { TabBar } from '@/components/market/TabBar';
import { OrderBookPanel } from '@/components/orderbook/OrderBookPanel';
import { QuotePanel } from '@/components/quote/QuotePanel';
import { useOrderBook } from '@/hooks/useOrderBook';

export default function Home() {
  useOrderBook();

  return (
    <AppShell>
      {/*
        Fireplace layout:
        ┌──────────┬──────────────┬──────────┬───────────┐
        │          │              │  Order   │           │
        │ Sidebar  │  Price Chart │  Book    │  Trade    │
        │          │              │          │  Panel    │
        ├──────────┴──────────────┴──────────┤           │
        │   Positions / Trades / etc tabs    │           │
        └────────────────────────────────────┴───────────┘

        Bottom tabs stretch under sidebar + chart + order book.
        Only trade panel stays full height on the right.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] h-full">
        {/* Left mega column: sidebar + chart + orderbook + tabs */}
        <div className="flex flex-col h-full overflow-hidden border-r border-border">
          {/* Top area: sidebar | chart | order book */}
          <div className="flex-1 min-h-0 flex overflow-hidden">
            {/* Sidebar */}
            {/* <div className="hidden lg:block w-[240px] shrink-0 border-r border-border overflow-hidden">
              <MarketSidebar />
            </div> */}
            {/* Chart */}
            <div className="flex-1 min-w-0 overflow-hidden border-r border-border">
              <PriceChart />
            </div>
            {/* Order Book */}
            <div className="hidden lg:block w-[280px] shrink-0 overflow-hidden">
              <OrderBookPanel />
            </div>
          </div>

          {/* Bottom tabs — full width under sidebar + chart + order book */}
          <div className="h-[240px] shrink-0 border-t border-border">
            <TabBar />
          </div>
        </div>

        {/* Right: Trade panel — full height */}
        <div className="hidden lg:flex flex-col bg-surface overflow-hidden">
          <QuotePanel />
        </div>
      </div>
    </AppShell>
  );
}
