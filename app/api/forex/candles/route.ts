import { NextRequest, NextResponse } from 'next/server';
import { fetchForexCandles } from '@/lib/alphavantage';
import type { Timeframe } from '@/types';

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get('symbol') ?? 'EUR/USD';
  const timeframe = (searchParams.get('timeframe') ?? '60min') as Timeframe;
  const outputSize = (searchParams.get('outputSize') ?? 'compact') as 'compact' | 'full';

  try {
    const candles = await fetchForexCandles(symbol, timeframe, outputSize);
    return NextResponse.json({ candles, symbol, timeframe });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch candles';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
