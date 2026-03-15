import { DEFAULT_MARKET } from '@/domain/market/constants';
import { useOrderBookStore } from '@/stores/orderbook-store';

type Bar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type SymbolInfo = {
  name: string;
  full_name: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  exchange: string;
  listed_exchange: string;
  minmov: number;
  pricescale: number;
  has_intraday: boolean;
  has_daily: boolean;
  has_weekly_and_monthly: boolean;
  supported_resolutions: string[];
  volume_precision: number;
  has_no_volume: boolean;
  data_status: string;
  format: string;
};

interface PricePoint { t: number; p: number; }

function resToFidelity(r: string): number {
  switch (r) { case '1': return 1; case '15': return 5; case '60': return 60; case '1D': case 'D': return 60; default: return 60; }
}
function resToSecs(r: string): number {
  switch (r) { case '1': return 60; case '15': return 900; case '60': return 3600; case '1D': case 'D': return 86400; default: return 3600; }
}

const polyInfo = DEFAULT_MARKET.venueInfo.find((v) => v.venue === 'polymarket');
const POLY_TOKEN = polyInfo?.tokenId ?? '';

const MARKET_EARLIEST_TS = Math.floor(Date.now() / 1000) - 86400 * 13;

async function fetchPolyHistory(tokenId: string, from: number, to: number, fidelity: number): Promise<PricePoint[]> {
  const resp = await fetch(`/api/prices-history?market=${tokenId}&startTs=${from}&endTs=${to}&fidelity=${fidelity}`);
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data.history || []) as PricePoint[];
}

function ptsToCandles(points: PricePoint[], candleSecs: number): Bar[] {
  if (!points.length) return [];
  const buckets = new Map<number, PricePoint[]>();
  for (const pt of points) {
    const k = Math.floor(pt.t / candleSecs) * candleSecs;
    const b = buckets.get(k);
    if (b) b.push(pt); else buckets.set(k, [pt]);
  }
  const bars: Bar[] = [];
  for (const k of Array.from(buckets.keys()).sort((a, b) => a - b)) {
    const pts = buckets.get(k)!;
    const px = pts.map((p) => p.p * 100);
    bars.push({
      time: k * 1000,
      open: +px[0].toFixed(2), high: +Math.max(...px).toFixed(2),
      low: +Math.min(...px).toFixed(2), close: +px[px.length - 1].toFixed(2),
      volume: pts.length,
    });
  }
  return bars;
}

function invertBar(bar: Bar): Bar {
  return {
    time: bar.time,
    open: +(100 - bar.open).toFixed(2),
    high: +(100 - bar.low).toFixed(2),
    low: +(100 - bar.high).toFixed(2),
    close: +(100 - bar.close).toFixed(2),
    volume: bar.volume,
  };
}

export function createDatafeed(invertPrices = false) {
  const subscribers = new Map<string, () => void>();
  let lastBar: Bar | null = null;

  return {
    onReady: (cb: (config: Record<string, unknown>) => void) => {
      setTimeout(() => cb({
        supported_resolutions: ['1', '15', '60', '1D'],
        supports_time: true,
        supports_marks: false,
        supports_timescale_marks: false,
      }), 0);
    },

    searchSymbols: (_u: string, _e: string, _t: string, onResult: (r: Record<string, unknown>[]) => void) => {
      onResult([]);
    },

    resolveSymbol: (_symbolName: string, onResolve: (si: SymbolInfo) => void) => {
      setTimeout(() => onResolve({
        name: invertPrices ? 'No' : 'Yes',
        full_name: invertPrices ? 'No' : 'Yes',
        description: DEFAULT_MARKET.title,
        type: 'crypto',
        session: '24x7',
        timezone: 'Etc/UTC',
        exchange: '',
        listed_exchange: '',
        minmov: 1,
        pricescale: 100,
        has_intraday: true,
        has_daily: true,
        has_weekly_and_monthly: false,
        supported_resolutions: ['1', '15', '60', '1D'],
        volume_precision: 0,
        has_no_volume: false,
        data_status: 'streaming',
        format: 'price',
      }), 0);
    },

    getBars: async (
      _symbolInfo: SymbolInfo,
      resolution: string,
      periodParams: { from: number; to: number; firstDataRequest?: boolean },
      onResult: (bars: Bar[], meta: { noData?: boolean }) => void,
      onError: (reason: string) => void
    ) => {
      const { from, to } = periodParams;

      if (to < MARKET_EARLIEST_TS) {
        onResult([], { noData: true });
        return;
      }

      try {
        const clampedFrom = Math.max(from, MARKET_EARLIEST_TS);
        const polyPts = await fetchPolyHistory(POLY_TOKEN, clampedFrom, to, resToFidelity(resolution));
        let bars = ptsToCandles(polyPts, resToSecs(resolution));
        if (invertPrices) bars = bars.map(invertBar);

        bars = bars.filter((b) => b.time >= from * 1000 && b.time <= to * 1000);

        if (bars.length > 0) {
          lastBar = bars[bars.length - 1];
        }

        onResult(bars, { noData: bars.length === 0 });
      } catch (err) {
        onError(String(err));
      }
    },

    subscribeBars: (
      _symbolInfo: SymbolInfo,
      resolution: string,
      onTick: (bar: Bar) => void,
      listenerGuid: string,
      _onResetCacheNeeded: () => void
    ) => {
      const resSecs = resToSecs(resolution);

      let prevPrice: number | null = null;
      const unsubscribe = useOrderBookStore.subscribe((state) => {
        const price = state.livePrice;
        if (price === null || price === prevPrice) return;
        prevPrice = price;
        let priceCents = +(price * 100).toFixed(2);
        if (invertPrices) priceCents = +(100 - priceCents).toFixed(2);

        const lb = lastBar;
        if (!lb) return;

        const now = Math.floor(Date.now() / 1000);
        const barTime = Math.floor(now / resSecs) * resSecs * 1000;

        let newBar: Bar;
        if (barTime === lb.time) {
          newBar = {
            ...lb,
            close: priceCents,
            high: +Math.max(lb.high, priceCents).toFixed(2),
            low: +Math.min(lb.low, priceCents).toFixed(2),
            volume: lb.volume + 1,
          };
        } else {
          newBar = {
            time: barTime,
            open: lb.close,
            high: +Math.max(lb.close, priceCents).toFixed(2),
            low: +Math.min(lb.close, priceCents).toFixed(2),
            close: priceCents,
            volume: 1,
          };
        }

        lastBar = newBar;
        onTick(newBar);
      });

      subscribers.set(listenerGuid, unsubscribe);
    },

    unsubscribeBars: (listenerGuid: string) => {
      const unsub = subscribers.get(listenerGuid);
      if (unsub) { unsub(); subscribers.delete(listenerGuid); }
    },
  };
}
