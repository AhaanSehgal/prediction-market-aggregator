# Galactic.pro - Prediction Market Aggregator

A real-time prediction market aggregator that combines order book data from **Polymarket** and **Kalshi** into a single unified trading interface. Built for the Fireplace.gg take-home assignment.

**Live demo:** Run locally with `npm run dev` → [http://localhost:3000](http://localhost:3000)

---

## Getting Started

```bash
npm install
npm run dev
```

Opens on port 3000. No API keys or environment variables required - all data comes from public market endpoints.

---

## What It Does

### 1. Aggregated Order Book
- Merges bid/ask levels from Polymarket and Kalshi into a single coherent book
- Per-level venue breakdown visible on hover (tooltip shows each venue's contribution with a stacked bar)
- Configurable tick size grouping (0.1¢ – 2¢), venue-aware: Kalshi-only view restricts to 1¢/2¢ since Kalshi uses cent-level pricing
- Rows flash on update (green for bids, red for asks) to make the book feel alive
- Spread, midpoint, and bid/sell ratio computed from the uncrossed merged book
- Supports both YES and NO outcome views (book is flipped: bids↔asks, prices become 1−price)
- Auto-scrolls asks to the spread on load and when switching outcomes

### 2. Real-Time Updates
- **Polymarket**: WebSocket connection (`wss://ws-subscriptions-clob.polymarket.com/ws/market`) for live order book snapshots and `price_change` events, with REST polling fallback every 5s
- **Kalshi**: REST polling every 3s (Kalshi's WebSocket API requires authenticated access)
- Both venues update independently; the merged book recomputes on every venue update
- Live price from WebSocket `price_change` events uses **midpoint** of best bid/ask (not last trade price) to avoid chart spikes from outlier trades

### 3. Connection Resilience
- **Automatic reconnection** with exponential backoff (1s base, 30s max) and jitter
- **Instant reconnect on network recovery**: listens for the browser `online` event, resets backoff, and reconnects immediately instead of waiting for the timer
- **Heartbeat/stale detection**: if no message arrives within 2× the heartbeat interval (30s for Polymarket), the connection is closed and reconnected
- **Per-venue connection status pills** in the header - dark cards with colored borders: green border when connected, red when down, neutral when offline. Status dot pulses during connecting/error states
- If one venue goes down, the other continues to provide data - the order book degrades gracefully to single-venue mode
- Footer shows aggregate connection health (Stable/Unstable)

### 4. Quote Engine
- Enter a dollar amount (buy) or share count (sell) and select YES/NO outcome
- The engine walks the merged order book, filling across both venues at real prices
- Shows: total shares/cost, average fill price, price impact, venue split breakdown with stacked bar, max payout and potential profit
- Quick-add buttons (+$10, +$50, +$200, +$1000) for fast amount entry
- **Uncrossing before flipping**: for NO quotes, the YES book is uncrossed first, then flipped - this prevents Kalshi crossed levels (e.g., YES asks at 15¢) from creating phantom NO bids at 85¢ that would filter out legitimate NO asks

### 5. TradingView Chart
- Full TradingView charting library with custom datafeed backed by Polymarket CLOB API
- Supports multiple timeframes (1m, 15m, 1h, 1D)
- Volume bars, line/area/candle chart types
- Live price displayed in browser tab title

### 6. Aggregated Market Stats
- **24h Volume**, **Total Volume**: summed across both venues with per-venue breakdown shown inline (venue logo + individual value in parentheses)
- **24h Change**: derived from Kalshi `last_price_dollars` vs `previous_price_dollars`, with Polymarket fallback
- All stats poll every 30s from both `/api/polymarket-market` and `/api/kalshi-market`
- Stats bar hidden below `xl` breakpoint to prevent layout overflow

### 7. Mobile Responsive
- **Mobile (< 1024px)**: Tab-based navigation (Chart / Order Book / Trade) - all panels accessible, just one at a time
- **Desktop (≥ 1024px)**: Full multi-panel layout with draggable resize handles for chart/orderbook column and chart/tabbar row
- Header, sub-header, YES/NO pills, and buttons all scale with responsive padding and font sizes
- Drag handles are desktop-only (mouse events); mobile uses full-height panels

---

## Architecture

```
src/
├── app/                    # Next.js App Router (layout, page, API routes)
├── components/
│   ├── layout/             # AppShell, LiveTitle, Providers
│   ├── market/             # PriceChart, TabBar, ConnectionStatus, MarketStats
│   ├── orderbook/          # OrderBookPanel (merged book with flash animations)
│   └── quote/              # QuotePanel (buy/sell quoting UI)
├── domain/
│   ├── market/             # Market constants, types, venue colors
│   └── orderbook/          # Core types (branded Probability/Dollars),
│                           #   normalizers, merge algorithm, quote engine
├── hooks/                  # useOrderBook, useMarketPrice, useMarketStats,
│                           #   useConnectionHealth
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

1. Venue sockets/pollers receive raw data
2. Normalizers convert to `NormalizedOrderBook` (consistent price/size format)
3. Zustand store merges all venue books into a single `MergedOrderBook`
4. UI components subscribe via selectors - only re-render when their slice changes

---

## Key Design Decisions

**Branded types for domain safety.** `Probability` and `Dollars` are branded number types (`number & { __brand }`) created via assertion functions. This prevents accidentally passing a price where a dollar amount is expected at the type level.

**Venue-agnostic merge layer.** Each venue normalizes its raw API data into a `NormalizedOrderBook`. The merge algorithm is venue-agnostic - adding a third venue would only require a new normalizer and socket adapter.

**Uncrossing the merged book.** When two venues are merged, it's possible for Kalshi's YES asks (converted to NO bids) to appear at prices that cross the spread. These are filtered out before display and quoting. For NO outcome views, the YES book is uncrossed *before* flipping to prevent phantom levels.

**WebSocket midpoint over trade price.** The Polymarket `price_change` event includes a `price` field (last trade) and `best_bid`/`best_ask`. We compute midpoint `(bid + ask) / 2` for chart updates because last trade prices can be outliers that cause chart spikes.

**Instant reconnect on network recovery.** Rather than waiting for exponential backoff timers, the `WebSocketManager` listens for the browser's `online` event and immediately reconnects with reset backoff.

**Venue-specific tick sizes.** Kalshi uses cent-level pricing (minimum 1¢ ticks), so when the order book is filtered to Kalshi-only, tick options are restricted to 1¢/2¢ and auto-set to 1¢. For NO outcome with "All" venues, tick defaults to 1¢ since sub-cent levels are sparse after flipping.

**Venue colors distinct from bid/ask.** Polymarket blue (`#3265F5`) and Kalshi teal (`#14B8A6`) were chosen to be visually distinct from bid green (`#00c076`) and ask red (`#ff4d6a`).

**Connection status pills with fixed-width labels.** Status labels use `w-[38px]` fixed width so the pill doesn't resize when status changes between "Live", "Down", "Off", or "Connecting" (which truncates). The pill border color reflects status: green when connected, red when down.

**Zustand for state.** Minimal boilerplate, great React 19 compatibility, and selector-based subscriptions mean components only re-render when their specific slice changes - critical for high-frequency order book updates. The `subscribeBars` datafeed also uses raw Zustand `subscribe()` from non-React code.

**WebSocketManager as a reusable primitive.** Exponential backoff, heartbeat monitoring, reconnection logic, and `online` event handling are encapsulated in a generic `WebSocketManager` class. Venue-specific sockets compose this rather than reimplementing connection management.

---

## Tradeoffs & Assumptions

| Decision | Tradeoff |
|---|---|
| Kalshi via REST polling (3s) | No real-time WebSocket without auth keys.|
| Single hardcoded market | Scope constraint - the architecture supports multiple markets but the UI is single-market. |
| No actual order placement | This is a quoting/pricing exercise only, as specified. |
| TradingView library loaded from `/public` | Avoids npm package issues; the library is self-contained. |
| Polymarket-only chart data | Kalshi doesn't expose historical candle data publicly without auth. Chart shows Polymarket prices with live WebSocket updates. |
| Stats poll every 30s | Market-level stats (volume, change) don't need sub-second freshness. Reduces API load. |
| Mobile uses tab switching | Rather than cramming all panels into a tiny screen, mobile shows one panel at a time (Chart/Book/Trade) for a clean experience. |

---

## What I'd Improve With More Time

- **Multi-market support**: Market discovery page, search, routing by market slug
- **Kalshi WebSocket**: Authenticated connection for true real-time Kalshi order book updates
- **Order book depth chart**: D3 visualization showing cumulative liquidity curves per venue
- **Historical quote analysis**: Show how a quote would have been filled at different points in time
- **Tests**: Unit tests for the merge algorithm and quote engine, integration tests for WebSocket reconnection behavior
- **Performance profiling**: Measure and optimize render frequency under high-throughput update bursts
- **Error boundaries**: Graceful UI degradation if a component throws during render
- **PWA support**: Service worker for offline shell, push notifications for price alerts
- **Touch-friendly resize**: Replace mouse-only drag handles with touch-compatible gesture handling on mobile

---

## Tech Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** with strict mode
- **Zustand** for state management
- **Tailwind CSS v4** for styling
- **TradingView Charting Library** for the price chart
