import { NextRequest, NextResponse } from 'next/server';
import { POLYMARKET_CLOB } from '@/lib/api-urls';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tokenId = sp.get('token_id') || '';
  const resp = await fetch(`${POLYMARKET_CLOB}/midpoint?token_id=${tokenId}`);
  const data = await resp.json();
  return NextResponse.json(data);
}
