import { NextRequest, NextResponse } from 'next/server';
import { fetchForexNews } from '@/lib/alphavantage';

export const maxDuration = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  try {
    const news = await fetchForexNews('forex currency trading', limit);
    return NextResponse.json({ news, timestamp: Date.now() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch news';
    return NextResponse.json({ error: msg, news: [] }, { status: 500 });
  }
}
