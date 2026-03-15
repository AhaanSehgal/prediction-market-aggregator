'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useOrderBookStore } from '@/stores/orderbook-store';

const PAD = { top: 8, right: 8, bottom: 20, left: 40 };

export function DepthChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mergedBook = useOrderBookStore((s) => s.mergedBook);

  const { bidPoints, askPoints } = useMemo(() => {
    const bidPoints: { price: number; cumSize: number }[] = [];
    let cumBid = 0;
    for (const level of mergedBook.bids) {
      cumBid += level.totalSize;
      bidPoints.push({ price: level.price, cumSize: cumBid });
    }

    const askPoints: { price: number; cumSize: number }[] = [];
    let cumAsk = 0;
    for (const level of mergedBook.asks) {
      cumAsk += level.totalSize;
      askPoints.push({ price: level.price, cumSize: cumAsk });
    }

    return { bidPoints, askPoints };
  }, [mergedBook.bids, mergedBook.asks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#131316';
    ctx.fillRect(0, 0, w, h);

    if (bidPoints.length === 0 && askPoints.length === 0) {
      ctx.fillStyle = '#5a5a66';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No depth data', w / 2, h / 2);
      return;
    }

    const chartW = w - PAD.left - PAD.right;
    const chartH = h - PAD.top - PAD.bottom;

    const allPrices = [
      ...bidPoints.map((p) => p.price),
      ...askPoints.map((p) => p.price),
    ];
    const minPrice = Math.max(0, Math.min(...allPrices) - 0.03);
    const maxPrice = Math.min(1, Math.max(...allPrices) + 0.03);
    const priceRange = maxPrice - minPrice || 0.1;

    const maxCum = Math.max(
      ...bidPoints.map((p) => p.cumSize),
      ...askPoints.map((p) => p.cumSize),
      1
    );

    const px = (price: number) => PAD.left + ((price - minPrice) / priceRange) * chartW;
    const py = (size: number) => PAD.top + chartH - (size / maxCum) * chartH;

    ctx.strokeStyle = '#1e1e22';
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 3; i++) {
      const y = PAD.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(w - PAD.right, y);
      ctx.stroke();
    }

    function drawStepArea(
      points: { price: number; cumSize: number }[],
      fillColor: string,
      strokeColor: string,
      direction: 'bid' | 'ask'
    ) {
      if (points.length === 0 || !ctx) return;

      ctx.beginPath();

      if (direction === 'bid') {
        ctx.moveTo(px(points[0].price), py(0));
        for (let i = 0; i < points.length; i++) {
          const x = px(points[i].price);
          const y = py(points[i].cumSize);
          if (i > 0) {
            ctx.lineTo(x, py(points[i - 1].cumSize));
          }
          ctx.lineTo(x, y);
        }
        ctx.lineTo(px(points[points.length - 1].price), py(0));
      } else {
        ctx.moveTo(px(points[0].price), py(0));
        for (let i = 0; i < points.length; i++) {
          const x = px(points[i].price);
          const y = py(points[i].cumSize);
          if (i > 0) {
            ctx.lineTo(x, py(points[i - 1].cumSize));
          }
          ctx.lineTo(x, y);
        }
        ctx.lineTo(px(points[points.length - 1].price), py(0));
      }

      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      ctx.beginPath();
      if (direction === 'bid') {
        ctx.moveTo(px(points[0].price), py(points[0].cumSize));
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(px(points[i].price), py(points[i - 1].cumSize));
          ctx.lineTo(px(points[i].price), py(points[i].cumSize));
        }
      } else {
        ctx.moveTo(px(points[0].price), py(points[0].cumSize));
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(px(points[i].price), py(points[i - 1].cumSize));
          ctx.lineTo(px(points[i].price), py(points[i].cumSize));
        }
      }
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    drawStepArea(bidPoints, 'rgba(0, 192, 118, 0.12)', '#00c076', 'bid');
    drawStepArea(askPoints, 'rgba(255, 77, 106, 0.12)', '#ff4d6a', 'ask');

    if (mergedBook.midpoint !== null) {
      const midX = px(mergedBook.midpoint);
      ctx.beginPath();
      ctx.moveTo(midX, PAD.top);
      ctx.lineTo(midX, PAD.top + chartH);
      ctx.strokeStyle = '#4da6ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = '#5a5a66';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    const numLabels = Math.min(6, Math.floor(chartW / 50));
    for (let i = 0; i <= numLabels; i++) {
      const price = minPrice + (priceRange / numLabels) * i;
      ctx.fillText(`${(price * 100).toFixed(0)}¢`, px(price), h - 4);
    }

    ctx.textAlign = 'right';
    for (let i = 0; i <= 3; i++) {
      const size = (maxCum / 3) * i;
      const y = py(size);
      const label = size >= 1000 ? `$${(size / 1000).toFixed(1)}K` : `$${size.toFixed(0)}`;
      ctx.fillText(label, PAD.left - 4, y + 3);
    }
  }, [bidPoints, askPoints, mergedBook.midpoint]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
