import { NextRequest, NextResponse } from 'next/server';

const CLOB = 'https://clob.polymarket.com';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const qs = sp.toString();
  const resp = await fetch(`${CLOB}/prices-history?${qs}`);
  const data = await resp.json();
  return NextResponse.json(data);
}
