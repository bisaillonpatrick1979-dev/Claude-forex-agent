import { NextRequest, NextResponse } from 'next/server';
import { fetchForexQuote } from '@/lib/alphavantage';

export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get('symbol') ?? 'EUR/USD';

  try {
    const quote = await fetchForexQuote(symbol);
    return NextResponse.json({ quote, symbol, timestamp: Date.now() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch quote';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
