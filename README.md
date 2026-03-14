# Galactic.pro — Prediction Market Aggregator

A real-time prediction market aggregator that combines order book data from **Polymarket** and **Kalshi** into a single unified view. Built as a take-home assignment for Fireplace.gg.

**Live demo:** Run locally with `npm run dev` → [http://localhost:3000](http://localhost:3000)

---

## Getting Started

```bash
npm install
npm run dev
```

The app opens on port 3000. No API keys or environment variables are required — all data comes from public market endpoints.

---

## Features

### 1. Aggregated Order Book
- Merges bid/ask levels from both Polymarket and Kalshi into a single coherent book
- Prices rounded to consistent precision; liquidity at the same price is summed
- Per-level venue breakdown visible on hover (tooltip shows Polymarket vs Kalshi contribution)
- Spread, midpoint, and bid/sell ratio computed from the uncrossed merged book
- Supports both YES and NO outcome views (book is flipped: bids↔asks, prices become 1−price)

### 2. Real-Time Updates
- **Polymarket**: WebSocket connection for live order book deltas, with REST polling fallback every 5s
- **Kalshi**: REST polling every 3s (Kalshi's WebSocket API requires authenticated access)
- Both venues update independently; the merged book recomputes on every venue update

### 3. Connection Resilience
- **Automatic reconnection** with exponential backoff (1s base, 30s max) and jitter
- **Heartbeat/stale detection**: if no message arrives within 2× the heartbeat interval, the connection is closed and reconnected
- **Per-venue connection status** displayed in the header (green = connected, yellow = connecting, red = error)
- If one venue goes down, the other continues to provide data — the order book degrades gracefully to single-venue mode

### 4. Quote Engine
- Enter a dollar amount (buy) or share count (sell) and select YES/NO outcome
- The engine walks the merged order book, filling across both venues at real prices
- Shows: total shares/cost, average fill price, venue split breakdown, max payout
- Crossed levels (an artifact of merging two venues) are filtered before quoting to prevent fills at incorrect prices

### 5. TradingView Chart
- Full TradingView charting library with custom datafeed backed by Polymarket CLOB API
- Supports multiple timeframes (1m, 15m, 1h, 1D)
- Volume bars, line/area/candle chart types
- Live price displayed in browser tab title

---

## Architecture

```
src/
├── app/                    # Next.js App Router (layout, page, globals)
├── components/
│   ├── layout/             # AppShell, LiveTitle, Providers
│   ├── market/             # PriceChart, TabBar, ConnectionStatus
│   ├── orderbook/          # OrderBookPanel (merged book display)
│   └── quote/              # QuotePanel (buy/sell quoting UI)
├── domain/
│   ├── market/             # Market constants, types
│   └── orderbook/          # Core types (branded Probability/Dollars),
│                           #   merge algorithm, quote engine
├── hooks/                  # useOrderBook, useMarketPrice, useMarketStats,
│                           #   useConnectionHealth
├── infrastructure/
│   ├── api/                # REST clients for Polymarket & Kalshi
│   └── websocket/          # WebSocketManager, PolymarketSocket, KalshiSocket
├── lib/                    # TradingView datafeed adapter
└── stores/                 # Zustand stores (orderbook-store, quote-store)
```

### Key Design Decisions

**Branded types for domain safety.** `Probability` and `Dollars` are branded number types. This prevents accidentally passing a price where a dollar amount is expected at the type level.

**Venue-agnostic merge layer.** Each venue normalizes its raw API data into a `NormalizedOrderBook`. The merge algorithm is venue-agnostic — adding a third venue (e.g., Manifold) would only require a new normalizer and socket adapter.

**Uncrossing the merged book.** When two venues are merged, it's possible for Kalshi NO bids (converted to YES asks) to appear below the best bid — creating "crossed" levels. These are filtered out before display and quoting to prevent misleading spreads and incorrect fills.

**Zustand for state.** Minimal boilerplate, great React 19 compatibility, and selector-based subscriptions mean components only re-render when their specific slice changes — critical for high-frequency order book updates.

**WebSocketManager as a reusable primitive.** Exponential backoff, heartbeat monitoring, and reconnection logic are encapsulated in a generic `WebSocketManager` class. Venue-specific sockets (`PolymarketSocket`, `KalshiSocket`) compose this rather than reimplementing connection management.

### Data Flow

```
Polymarket WS ─┐                    ┌─ OrderBookPanel
Polymarket REST ┤→ normalize → store ├─ QuotePanel
Kalshi REST ────┘    merge ↑        └─ PriceChart
```

1. Venue sockets receive raw data (WebSocket or REST poll)
2. Normalizers convert to `NormalizedOrderBook` (consistent price/size format)
3. Store merges all venue books into a single `MergedOrderBook`
4. UI components subscribe to the merged book via Zustand selectors

---

## Tradeoffs & Assumptions

| Decision | Tradeoff |
|---|---|
| Kalshi via REST polling (3s) | No real-time WebSocket without auth. Acceptable latency for a demo. |
| Single hardcoded market | Scope constraint — the architecture supports multiple markets but the UI is single-market. |
| No actual order placement | This is a quoting/pricing exercise only, as specified. |
| TradingView library loaded from `/public` | Avoids npm package issues; the library is self-contained. |
| Polymarket-only chart data | Kalshi doesn't expose historical candle data publicly. Chart shows Polymarket prices. |
| Total volume from Polymarket only | Venues report their own volume; summing would double-count shared liquidity. |

---

## What I'd Improve With More Time

- **Multi-market support**: Market discovery page, search, routing by market slug
- **Kalshi WebSocket**: Authenticated connection for true real-time Kalshi updates
- **Order book depth chart**: D3 visualization showing cumulative liquidity curves per venue
- **Historical quote analysis**: Show how a quote would have been filled at different points in time
- **Mobile responsive layout**: Current layout is optimized for desktop
- **Tests**: Unit tests for the merge algorithm and quote engine, integration tests for WebSocket reconnection
- **Performance profiling**: Measure and optimize render frequency under high-throughput updates
- **Error boundaries**: Graceful UI degradation if a component throws

---

## Tech Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** with strict mode
- **Zustand** for state management
- **TanStack Query** for REST data fetching
- **Tailwind CSS v4** for styling
- **TradingView Charting Library** for the price chart
- **D3** for order book depth visualization
