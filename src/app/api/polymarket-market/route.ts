import { NextResponse } from 'next/server';
import { POLYMARKET_GAMMA } from '@/lib/api-urls';

export async function GET() {
  const resp = await fetch(
    `${POLYMARKET_GAMMA}/markets?slug=will-jd-vance-win-the-2028-us-presidential-election`
  );
  const data = await resp.json();
  return NextResponse.json(data?.[0] ?? {});
}
