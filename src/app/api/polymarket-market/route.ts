import { NextResponse } from 'next/server';

const GAMMA = 'https://gamma-api.polymarket.com';

export async function GET() {
  const resp = await fetch(
    `${GAMMA}/markets?slug=will-jd-vance-win-the-2028-us-presidential-election`
  );
  const data = await resp.json();
  return NextResponse.json(data?.[0] ?? {});
}
