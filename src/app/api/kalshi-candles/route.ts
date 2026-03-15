import { NextRequest, NextResponse } from 'next/server';
import { KALSHI_API } from '@/lib/api-urls';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const series = sp.get('series') || '';
  const ticker = sp.get('ticker') || '';
  const startTs = sp.get('start_ts') || '';
  const endTs = sp.get('end_ts') || '';
  const interval = sp.get('period_interval') || '60';

  const resp = await fetch(
    `${KALSHI_API}/series/${series}/markets/${ticker}/candlesticks?start_ts=${startTs}&end_ts=${endTs}&period_interval=${interval}`
  );
  const data = await resp.json();
  return NextResponse.json(data);
}
