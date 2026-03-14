import { NextRequest, NextResponse } from 'next/server';

const KALSHI = 'https://api.elections.kalshi.com/trade-api/v2';

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker') || '';
  const resp = await fetch(`${KALSHI}/markets/${ticker}`);
  const data = await resp.json();
  return NextResponse.json(data);
}
