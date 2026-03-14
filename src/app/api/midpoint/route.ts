import { NextRequest, NextResponse } from 'next/server';

const CLOB = 'https://clob.polymarket.com';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tokenId = sp.get('token_id') || '';
  const resp = await fetch(`${CLOB}/midpoint?token_id=${tokenId}`);
  const data = await resp.json();
  return NextResponse.json(data);
}
