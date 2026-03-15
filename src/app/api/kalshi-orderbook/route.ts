import { NextRequest, NextResponse } from 'next/server';
import { KALSHI_API } from '@/lib/api-urls';

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker') || '';
  const resp = await fetch(`${KALSHI_API}/markets/${ticker}/orderbook`, {
    headers: { 'Accept': 'application/json' },
  });
  const data = await resp.json();
  return NextResponse.json(data);
}
