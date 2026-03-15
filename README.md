# Galactic.pro - Prediction Market Aggregator

A real-time prediction market aggregator that combines order book data from Polymarket and Kalshi into a unified trading interface. Built as a single-market aggregator that prioritizes correctness of the merged order book and quote engine over breadth of features.

**[Live Demo](https://galactic-pro.vercel.app)** · Run locally: `npm install && npm run dev` -> `http://localhost:3000`

No API keys or environment variables required - all data comes from public market endpoints.

---

## What It Does

### Aggregated Order Book
Merges bid/ask levels from Polymarket and Kalshi into a single coherent book. Per-level venue breakdown is visible on hover - a tooltip shows each venue's contribution with a stacked bar. Configurable tick size grouping (0.1c-2c), venue-aware: Kalshi-only view restricts to 1c/2c since Kalshi uses cent-level pricing. Rows flash on update (green for bids, red for asks). Spread, midpoint, and bid/sell ratio are computed from the uncrossed merged book. Supports both YES and NO outcome views, with the book flipped accordingly (bids<->asks, prices become 1-price). Auto-scrolls asks to the spread on load and when switching outcomes.

### Real-Time Updates
Polymarket connects via WebSocket (`wss://ws-subscriptions-clob.polymarket.com/ws/market`) for live order book snapshots and `price_change` events, with REST polling fallback every 5s. Kalshi uses REST polling every 3s (Kalshi's WebSocket API requires authenticated access). Both venues update independently; the merged book recomputes on every venue update. Live price from WebSocket `price_change` events uses the midpoint of best bid/ask rather than last trade price to avoid chart spikes from outlier trades.

### Connection Resilience
Automatic reconnection with exponential backoff (1s base, 30s max) and jitter. Instant reconnect on network recovery via the browser `online` event - resets backoff and reconnects immediately instead of waiting for the timer. Heartbeat/stale detection: if no message arrives within 2x the heartbeat interval (30s for Polymarket), the connection is closed and reconnected. Per-venue connection status pills in the header with colored borders (green when connected, red when down). Status dot pulses during connecting/error states. If one venue goes down, the other continues to provide data - the order book degrades gracefully to single-venue mode. Footer shows aggregate connection health.

### Quote Engine
Enter a dollar amount (buy) or share count (sell) and select YES/NO outcome. The engine walks the merged order book, filling across both venues at real prices. Shows total shares/cost, average fill price, price impact, venue split breakdown with stacked bar, max payout and potential profit. Quick-add buttons (+$10, +$50, +$200, +$1000) for fast amount entry. For NO quotes, the YES book is uncrossed first then flipped - this prevents Kalshi crossed levels from creating phantom bids that would filter out legitimate asks.

### TradingView Chart
Full TradingView charting library with custom datafeed backed by Polymarket CLOB API. Supports multiple timeframes (1m, 15m, 1h, 1D). Volume bars, line/area/candle chart types. Live price displayed in browser tab title.

### Aggregated Market Stats
24h Volume and Total Volume summed across both venues with per-venue breakdown shown inline. 24h Change derived from Kalshi data with Polymarket fallback. Stats poll every 30s. Responsive - stats bar hidden below xl breakpoint to prevent layout overflow.

### Mobile Responsive
Mobile (< 1024px) uses tab-based navigation (Chart / Order Book / Trade) - all panels accessible, one at a time. Desktop (>= 1024px) uses full multi-panel layout with draggable resize handles. Header, sub-header, and interactive elements all scale with responsive sizing.

---

## Architecture

```
src/
├── app/                    # Next.js App Router (layout, page, API routes)
├── components/
│   ├── layout/             # AppShell, LiveTitle, Providers
│   ├── market/             # PriceChart, TabBar, ConnectionStatus, MarketStats
│   ├── orderbook/          # OrderBookPanel, OrderBookHeader, BalanceBar, SpreadRow
│   └── quote/              # QuotePanel, SideTabs, OutcomeRow, AmountInput,
│                           #   QuickAmounts, QuoteDetails, FillSplit, PayoutSummary
├── domain/
│   ├── market/             # Market constants, types, venue colors
│   └── orderbook/          # Core types (branded Probability/Dollars),
│                           #   normalizers, merge algorithm, quote engine,
│                           #   transforms (flip, uncross, group, filter, cumulatives)
├── hooks/                  # useOrderBook, useOrderBookView, useBookForQuote,
│                           #   useMarketPrice, useMarketStats, useConnectionHealth
├── infrastructure/
│   ├── api/                # REST clients for Polymarket & Kalshi
│   └── websocket/          # WebSocketManager, PolymarketSocket, KalshiSocket
├── lib/                    # TradingView datafeed adapter
└── stores/                 # Zustand stores (orderbook-store, quote-store)
```

### Data Flow

```
Polymarket WS ──┐                          ┌─ OrderBookPanel (flash on update)
Polymarket REST ─┤→ normalize → zustand ───├─ QuotePanel (walk merged book)
Kalshi REST ─────┘    merge ↑   store      ├─ PriceChart (subscribe to livePrice)
                                           └─ MarketStats (poll both APIs)
```

Venue sockets/pollers receive raw data. Normalizers convert to `NormalizedOrderBook`. Zustand store merges all venue books into a single `MergedOrderBook`. UI components subscribe via selectors and only re-render when their slice changes.

### Layered Separation

The codebase follows strict dependency inversion. The dependency graph flows one way: components -> hooks -> domain.

**Domain layer** (`domain/orderbook/transforms.ts`, `quote-engine.ts`, `aggregator.ts`, `normalizer.ts`): All order book transforms - flipping, uncrossing, tick grouping, venue filtering, cumulative math - are pure functions with zero dependencies on React or stores.

**Hooks layer** (`useOrderBookView`, `useBookForQuote`): Compose domain functions with Zustand store state.

**Component layer**: Thin presentational shells. `OrderBookPanel` is a composer that calls `useOrderBookView()` and renders sub-components (`OrderBookHeader`, `BalanceBar`, `SpreadRow`). `QuotePanel` uses `useBookForQuote()` and renders 6 pure sub-components (`SideTabs`, `OutcomeRow`, `AmountInput`, `QuickAmounts`, `QuoteDetails`, `FillSplit`, `PayoutSummary`). All sub-components are props-in, JSX-out.

**Extensibility**: Adding a new venue (e.g. Manifold) means writing a new normalizer + socket adapter and extending `VenueId`. No existing code changes required.

---

## Key Design Decisions

**Branded types for domain safety.** `Probability` and `Dollars` are branded number types (`number & { __brand }`) created via assertion functions. This prevents accidentally passing a price where a dollar amount is expected at the type level.

**Venue-agnostic merge layer.** Each venue normalizes its raw API data into a `NormalizedOrderBook`. The merge algorithm is venue-agnostic - adding a third venue would only require a new normalizer and socket adapter.

**Uncrossing the merged book.** When two venues are merged, it's possible for Kalshi's YES asks (converted to NO bids) to appear at prices that cross the spread. These are filtered out before display and quoting. For NO outcome views, the YES book is uncrossed before flipping to prevent phantom levels.

**WebSocket midpoint over trade price.** The Polymarket `price_change` event includes a `price` field (last trade) and `best_bid`/`best_ask`. We compute `(bid + ask) / 2` for chart updates because last trade prices can be outliers that cause chart spikes.

**Instant reconnect on network recovery.** Rather than waiting for exponential backoff timers, the `WebSocketManager` listens for the browser's `online` event and immediately reconnects with reset backoff.

**Venue-specific tick sizes.** Kalshi uses cent-level pricing (minimum 1c ticks), so when the order book is filtered to Kalshi-only, tick options are restricted to 1c/2c. For NO outcome with "All" venues, tick defaults to 1c since sub-cent levels are sparse after flipping.

**Zustand for state.** Selector-based subscriptions mean components only re-render when their specific slice changes - critical for high-frequency order book updates. The `subscribeBars` datafeed also uses raw Zustand `subscribe()` from non-React code.

**WebSocketManager as a reusable primitive.** Exponential backoff, heartbeat monitoring, reconnection logic, and `online` event handling are encapsulated in a generic class. Venue-specific sockets compose this rather than reimplementing connection management.

---

## Tradeoffs & Assumptions

| Decision | Tradeoff |
|---|---|
| Kalshi via REST polling (3s) | No real-time WebSocket without auth keys. Polling gives near-real-time at the cost of 3s staleness. |
| Single hardcoded market | Scope constraint. The architecture supports multiple markets but the UI is single-market. |
| No actual order placement | Quoting/pricing exercise only, as specified. |
| TradingView library from `/public` | Avoids npm package issues; the library is self-contained. |
| Polymarket-only chart data | Kalshi doesn't expose historical candle data publicly. Chart shows Polymarket prices with live WebSocket updates. |
| Stats poll every 30s | Market-level stats don't need sub-second freshness. Reduces API load. |
| Mobile uses tab switching | Rather than cramming all panels into a small screen, mobile shows one panel at a time for a clean experience. |

---

## What I'd Improve With More Time

- **Kalshi WebSocket**: Authenticated connection for true real-time Kalshi order book updates, eliminating polling latency.
- **Depth chart**: D3/canvas visualization showing cumulative liquidity curves per venue - makes it immediately obvious where liquidity is concentrated.
- **Tests**: Unit tests for the merge algorithm, transforms, and quote engine (all pure functions, easily testable), integration tests for WebSocket reconnection behavior.
- **Multi-market support**: Market discovery page, search, and routing by market slug.
- **Performance profiling**: Measure and optimize render frequency under high-throughput update bursts.
- **Error boundaries**: Graceful UI degradation if a component throws during render.

---

## Tech Stack

- Next.js 16 (App Router) + React 19
- TypeScript (strict mode)
- Zustand for state management
- Tailwind CSS v4
- TradingView Charting Library
