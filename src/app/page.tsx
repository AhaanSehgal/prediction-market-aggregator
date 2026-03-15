'use client';

import React, { useState, useCallback, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PriceChart } from '@/components/market/PriceChart';
import { TabBar } from '@/components/market/TabBar';
import { OrderBookPanel } from '@/components/orderbook/OrderBookPanel';
import { QuotePanel } from '@/components/quote/QuotePanel';
import { useOrderBook } from '@/hooks/useOrderBook';

type MobileTab = 'chart' | 'book' | 'trade';

function startDrag(
  axis: 'x' | 'y',
  startPos: number,
  cursorStyle: string,
  onDrag: (delta: number) => void,
) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `position:fixed;inset:0;z-index:99999;cursor:${cursorStyle}`;
  document.body.appendChild(overlay);
  document.body.style.cursor = cursorStyle;
  document.body.style.userSelect = 'none';

  let last = startPos;

  const onMouseMove = (ev: MouseEvent) => {
    const pos = axis === 'y' ? ev.clientY : ev.clientX;
    const delta = pos - last;
    last = pos;
    if (delta !== 0) onDrag(delta);
  };

  const cleanup = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', cleanup);
    window.removeEventListener('blur', cleanup);
    overlay.remove();
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', cleanup);
  window.addEventListener('blur', cleanup);
}

function RowDragHandle({ onDrag }: { onDrag: (delta: number) => void }) {
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startDrag('y', e.clientY, 'row-resize', onDrag);
  }, [onDrag]);

  return (
    <div
      onMouseDown={onMouseDown}
      className="shrink-0 flex items-center justify-center h-[9px] cursor-row-resize border-t border-b border-border bg-surface hover:bg-surface-2 transition-colors group"
    >
      <div className="flex gap-[3px]">
        <span className="w-[4px] h-[4px] rounded-full bg-muted group-hover:bg-muted-light transition-colors" />
        <span className="w-[4px] h-[4px] rounded-full bg-muted group-hover:bg-muted-light transition-colors" />
        <span className="w-[4px] h-[4px] rounded-full bg-muted group-hover:bg-muted-light transition-colors" />
      </div>
    </div>
  );
}

function ColDragHandle({ onDrag }: { onDrag: (delta: number) => void }) {
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startDrag('x', e.clientX, 'col-resize', onDrag);
  }, [onDrag]);

  return (
    <div
      onMouseDown={onMouseDown}
      className="shrink-0 flex items-center justify-center w-[9px] cursor-col-resize border-l border-r border-border bg-surface hover:bg-surface-2 transition-colors group"
    >
      <div className="flex flex-col gap-[3px]">
        <span className="w-[4px] h-[4px] rounded-full bg-muted group-hover:bg-muted-light transition-colors" />
        <span className="w-[4px] h-[4px] rounded-full bg-muted group-hover:bg-muted-light transition-colors" />
        <span className="w-[4px] h-[4px] rounded-full bg-muted group-hover:bg-muted-light transition-colors" />
      </div>
    </div>
  );
}

export default function Home() {
  useOrderBook();

  const containerRef = useRef<HTMLDivElement>(null);
  const [bottomHeight, setBottomHeight] = useState(160);
  const [obWidth, setObWidth] = useState(280);
  const [mobileTab, setMobileTab] = useState<MobileTab>('chart');

  const handleRowDrag = useCallback((deltaY: number) => {
    setBottomHeight((prev) => {
      const container = containerRef.current;
      if (!container) return prev;
      const maxBottom = container.clientHeight - 200;
      const minBottom = 80;
      return Math.max(minBottom, Math.min(maxBottom, prev - deltaY));
    });
  }, []);

  const handleColDrag = useCallback((deltaX: number) => {
    setObWidth((prev) => {
      const next = prev - deltaX;
      return Math.max(200, Math.min(450, next));
    });
  }, []);

  return (
    <AppShell>
      <div className="flex lg:hidden border-b border-border bg-surface shrink-0">
        {(['chart', 'book', 'trade'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-[13px] font-medium text-center transition-colors ${
              mobileTab === tab
                ? 'text-foreground border-b-2 border-accent'
                : 'text-muted hover:text-muted-light'
            }`}
          >
            {tab === 'chart' ? 'Chart' : tab === 'book' ? 'Order Book' : 'Trade'}
          </button>
        ))}
      </div>

      <div className="flex-1 lg:hidden overflow-hidden">
        {mobileTab === 'chart' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 min-h-0 overflow-hidden">
              <PriceChart />
            </div>
            <div className="shrink-0 overflow-hidden" style={{ height: Math.min(bottomHeight, 160) }}>
              <TabBar />
            </div>
          </div>
        )}
        {mobileTab === 'book' && (
          <div className="h-full overflow-hidden">
            <OrderBookPanel />
          </div>
        )}
        {mobileTab === 'trade' && (
          <div className="h-full overflow-hidden bg-surface">
            <QuotePanel />
          </div>
        )}
      </div>

      <div className="hidden lg:grid grid-cols-[1fr_300px] flex-1 min-h-0">
        <div ref={containerRef} className="flex flex-col h-full overflow-hidden border-r border-border">
          <div className="flex-1 min-h-0 flex overflow-hidden">
            <div className="flex-1 min-w-0 overflow-hidden">
              <PriceChart />
            </div>
            <ColDragHandle onDrag={handleColDrag} />
            <div className="shrink-0 overflow-hidden" style={{ width: obWidth }}>
              <OrderBookPanel />
            </div>
          </div>

          <RowDragHandle onDrag={handleRowDrag} />

          <div className="shrink-0 overflow-hidden" style={{ height: bottomHeight }}>
            <TabBar />
          </div>
        </div>

        <div className="flex flex-col bg-surface overflow-hidden">
          <QuotePanel />
        </div>
      </div>
    </AppShell>
  );
}
