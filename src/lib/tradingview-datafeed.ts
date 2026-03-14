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
  data_status: string;
  format: string;
};

function generateBars(resolution: string, from: number, to: number): Bar[] {
  const bars: Bar[] = [];
  let intervalSecs: number;

  switch (resolution) {
    case '1': intervalSecs = 60; break;
    case '15': intervalSecs = 900; break;
    case '60': intervalSecs = 3600; break;
    case '1D': case 'D': intervalSecs = 86400; break;
    default: intervalSecs = 3600;
  }

  let price = 38.4;
  const seed = from;

  // Simple seeded random for consistent data
  let rng = seed;
  function random() {
    rng = (rng * 16807 + 0) % 2147483647;
    return (rng & 0x7fffffff) / 0x7fffffff;
  }

  for (let t = from; t <= to; t += intervalSecs) {
    const volatility = 0.3 + random() * 0.8;
    const change = (random() - 0.48) * volatility;
    const open = price;
    const close = Math.max(1, Math.min(99, open + change));
    const high = Math.max(open, close) + random() * 0.4;
    const low = Math.min(open, close) - random() * 0.4;
    const volume = Math.floor(200 + random() * 8000);

    bars.push({
      time: t * 1000, // TradingView expects ms
      open: +open.toFixed(1),
      high: +Math.max(1, high).toFixed(1),
      low: +Math.max(1, low).toFixed(1),
      close: +close.toFixed(1),
      volume,
    });

    price = close;
  }

  return bars;
}

export function createDatafeed() {
  const subscribers: Map<string, ReturnType<typeof setInterval>> = new Map();
  let lastBar: Bar | null = null;

  return {
    onReady: (callback: (config: any) => void) => {
      setTimeout(() => {
        callback({
          supported_resolutions: ['1', '15', '60', '1D'],
          supports_time: true,
          supports_marks: false,
          supports_timescale_marks: false,
        });
      }, 0);
    },

    searchSymbols: (
      _userInput: string,
      _exchange: string,
      _symbolType: string,
      onResult: (result: any[]) => void
    ) => {
      onResult([]);
    },

    resolveSymbol: (
      symbolName: string,
      onResolve: (symbolInfo: SymbolInfo) => void,
      _onError: (reason: string) => void
    ) => {
      setTimeout(() => {
        onResolve({
          name: symbolName,
          full_name: symbolName,
          description: 'Will JD Vance win the 2028 US Presidential Election?',
          type: 'crypto',
          session: '24x7',
          timezone: 'Etc/UTC',
          exchange: 'PMAgg',
          listed_exchange: 'PMAgg',
          minmov: 1,
          pricescale: 10,
          has_intraday: true,
          has_daily: true,
          has_weekly_and_monthly: false,
          supported_resolutions: ['1', '15', '60', '1D'],
          volume_precision: 0,
          has_no_volume: false,
          data_status: 'streaming',
          format: 'price',
        });
      }, 0);
    },

    getBars: (
      _symbolInfo: SymbolInfo,
      resolution: string,
      periodParams: { from: number; to: number; firstDataRequest?: boolean },
      onResult: (bars: Bar[], meta: { noData?: boolean }) => void,
      _onError: (reason: string) => void
    ) => {
      const bars = generateBars(resolution, periodParams.from, periodParams.to);
      if (bars.length > 0) {
        lastBar = bars[bars.length - 1];
      }
      onResult(bars, { noData: bars.length === 0 });
    },

    subscribeBars: (
      _symbolInfo: SymbolInfo,
      resolution: string,
      onTick: (bar: Bar) => void,
      listenerGuid: string,
      _onResetCacheNeeded: () => void
    ) => {
      let intervalMs: number;
      switch (resolution) {
        case '1': intervalMs = 5000; break;
        case '15': intervalMs = 10000; break;
        case '60': intervalMs = 15000; break;
        default: intervalMs = 30000;
      }

      const id = setInterval(() => {
        if (!lastBar) return;

        const now = Math.floor(Date.now() / 1000);
        let resolutionSecs: number;
        switch (resolution) {
          case '1': resolutionSecs = 60; break;
          case '15': resolutionSecs = 900; break;
          case '60': resolutionSecs = 3600; break;
          default: resolutionSecs = 86400;
        }

        const barTime = Math.floor(now / resolutionSecs) * resolutionSecs * 1000;
        const change = (Math.random() - 0.48) * 0.3;
        const newClose = Math.max(1, Math.min(99, lastBar.close + change));

        if (barTime === lastBar.time) {
          // Update current bar
          lastBar = {
            ...lastBar,
            close: +newClose.toFixed(1),
            high: +Math.max(lastBar.high, newClose).toFixed(1),
            low: +Math.min(lastBar.low, newClose).toFixed(1),
            volume: lastBar.volume + Math.floor(Math.random() * 100),
          };
        } else {
          // New bar
          lastBar = {
            time: barTime,
            open: lastBar.close,
            high: +Math.max(lastBar.close, newClose).toFixed(1),
            low: +Math.min(lastBar.close, newClose).toFixed(1),
            close: +newClose.toFixed(1),
            volume: Math.floor(Math.random() * 2000),
          };
        }

        onTick(lastBar);
      }, intervalMs);

      subscribers.set(listenerGuid, id);
    },

    unsubscribeBars: (listenerGuid: string) => {
      const id = subscribers.get(listenerGuid);
      if (id) {
        clearInterval(id);
        subscribers.delete(listenerGuid);
      }
    },
  };
}
