'use client';

import React, { useRef, useEffect, useState } from 'react';
import { createDatafeed } from '@/lib/tradingview-datafeed';

declare global {
  interface Window {
    TradingView: any;
  }
}

const PURPLE = '#a855f7';
const GREEN = '#00c076';
const RED = '#ff4d6a';
const BG = '#131316';
const GRID = '#1c1c20';
const BORDER = '#222226';
const TEXT_DIM = '#5a5a66';

export function PriceChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.TradingView?.widget) {
      setReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = '/charting_library/charting_library.standalone.js';
    script.async = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
    return () => {};
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || widgetRef.current) return;
    if (!window.TradingView?.widget) return;

    const tvWidget = new window.TradingView.widget({
      symbol: 'JD Vance 2028',
      datafeed: createDatafeed(),
      interval: '60',
      container: containerRef.current,
      library_path: '/charting_library/',
      locale: 'en',
      custom_font_family: "'Satoshi', sans-serif",
      theme: 'dark',
      // Style 2 = Line chart (default)
      style: 2,
      autosize: true,
      toolbar_bg: BG,
      loading_screen: { backgroundColor: BG, foregroundColor: PURPLE },
      custom_css_url: '/tradingview-overrides.css',
      overrides: {
        // Background
        'paneProperties.background': BG,
        'paneProperties.backgroundType': 'solid',
        'paneProperties.backgroundGradientStartColor': BG,
        'paneProperties.backgroundGradientEndColor': BG,
        'paneProperties.vertGridProperties.color': GRID,
        'paneProperties.horzGridProperties.color': GRID,
        'paneProperties.separatorColor': BORDER,

        // Scales
        'scalesProperties.backgroundColor': BG,
        'scalesProperties.textColor': TEXT_DIM,
        'scalesProperties.lineColor': BORDER,
        'scalesProperties.fontSize': 11,

        // Area style — purple line with gradient fill (Fireplace look)
        'mainSeriesProperties.areaStyle.color1': 'rgba(168, 85, 247, 0.28)',
        'mainSeriesProperties.areaStyle.color2': 'rgba(168, 85, 247, 0.0)',
        'mainSeriesProperties.areaStyle.linecolor': PURPLE,
        'mainSeriesProperties.areaStyle.linewidth': 2,
        'mainSeriesProperties.areaStyle.priceSource': 'close',
        'mainSeriesProperties.areaStyle.transparency': 0,

        // Line style fallback
        'mainSeriesProperties.lineStyle.color': PURPLE,
        'mainSeriesProperties.lineStyle.linewidth': 2,
        'mainSeriesProperties.lineStyle.priceSource': 'close',

        // Candle
        'mainSeriesProperties.candleStyle.upColor': GREEN,
        'mainSeriesProperties.candleStyle.downColor': RED,
        'mainSeriesProperties.candleStyle.borderUpColor': GREEN,
        'mainSeriesProperties.candleStyle.borderDownColor': RED,
        'mainSeriesProperties.candleStyle.wickUpColor': GREEN + '80',
        'mainSeriesProperties.candleStyle.wickDownColor': RED + '80',

        // Price line
        'mainSeriesProperties.priceLineColor': PURPLE,
        'mainSeriesProperties.priceLineWidth': 1,

        // Crosshair
        'paneProperties.crossHairProperties.color': '#5a5a6680',
        'paneProperties.crossHairProperties.style': 2,

      },
      studies_overrides: {
        'volume.volume.color.0': RED,
        'volume.volume.color.1': GREEN,
        'volume.volume.transparency': 50,
        'volume.volume ma.color': '#FF000000',
        'volume.volume ma.transparency': 100,
        'volume.volume ma.linewidth': 0,
        'volume.show ma': false,
      },
      disabled_features: [
        'header_symbol_search',
        'symbol_search_hot_key',
        'header_compare',
        'display_market_status',
        'timeframes_toolbar',
        'go_to_date',
        'header_saveload',
        'left_toolbar',
        'control_bar',
        'border_around_the_chart',
        'remove_library_container_border',
        'legend_context_menu',
        'main_series_scale_menu',
        'create_volume_indicator_by_default',
      ],
      enabled_features: [
        'header_chart_type',
        'header_indicators',
        'header_resolutions',
        'header_screenshot',
        'header_undo_redo',
        'header_fullscreen_button',
        'hide_left_toolbar_by_default',
        'items_favoriting',
      ],
      favorites: {
        intervals: ['1', '15', '60', '1D'],
        chartTypes: [],
      },
    });

    tvWidget.onChartReady(() => {
      const chart = tvWidget.activeChart();

      // Force background + area style overrides via API
      try {
        chart.applyOverrides({
          'paneProperties.background': BG,
          'paneProperties.backgroundType': 'solid',
          'paneProperties.backgroundGradientStartColor': BG,
          'paneProperties.backgroundGradientEndColor': BG,
          'scalesProperties.backgroundColor': BG,
          'mainSeriesProperties.areaStyle.linecolor': PURPLE,
          'mainSeriesProperties.areaStyle.linewidth': 2,
          'mainSeriesProperties.areaStyle.color1': 'rgba(168, 85, 247, 0.28)',
          'mainSeriesProperties.areaStyle.color2': 'rgba(168, 85, 247, 0.0)',
          'mainSeriesProperties.areaStyle.transparency': 0,
          'mainSeriesProperties.lineStyle.color': PURPLE,
        });
      } catch {
        // Some TV versions don't support applyOverrides
      }

      // Force line chart type (2)
      try {
        chart.setChartType(2);
      } catch {
        // Fallback — style param should handle it
      }

      // Add volume overlaid on main chart pane (like Fireplace — bars at bottom of price chart)
      chart.createStudy('Volume', true, false, undefined, undefined, {
        'color.0': RED,
        'color.1': GREEN,
        'transparency': 50,
      });

    });

    widgetRef.current = tvWidget;

    return () => {
      if (widgetRef.current) {
        widgetRef.current.remove();
        widgetRef.current = null;
      }
    };
  }, [ready]);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: '#131316' }}>
      <div ref={containerRef} className="absolute inset-0" style={{ backgroundColor: '#131316' }} />
    </div>
  );
}
