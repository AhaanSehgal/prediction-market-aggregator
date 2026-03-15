import { NextRequest, NextResponse } from 'next/server';
import { POLYMARKET_CLOB } from '@/lib/api-urls';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const qs = sp.toString();
  const resp = await fetch(`${POLYMARKET_CLOB}/prices-history?${qs}`);
  const data = await resp.json();
  return NextResponse.json(data);
}
