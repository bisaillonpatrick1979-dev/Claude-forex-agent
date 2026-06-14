import axios from 'axios';
import type { CandleData, NewsItem, Timeframe } from '@/types';

const BASE_URL = 'https://www.alphavantage.co/query';

function getApiKey(): string {
  const key = process.env.ALPHAVANTAGE_API_KEY;
  if (!key) throw new Error('ALPHAVANTAGE_API_KEY not configured');
  return key;
}

function avTimeframe(tf: Timeframe): string {
  const map: Record<Timeframe, string> = {
    '1min': '1min',
    '5min': '5min',
    '15min': '15min',
    '30min': '30min',
    '60min': '60min',
    daily: 'daily',
    weekly: 'weekly',
    monthly: 'monthly',
  };
  return map[tf];
}

// Parse symbol "EUR/USD" → fromCurrency + toCurrency
function parseForexSymbol(symbol: string): { from: string; to: string } {
  const [from, to] = symbol.replace('/', '').match(/.{3}/g) ?? ['EUR', 'USD'];
  return { from, to };
}

export async function fetchForexCandles(
  symbol: string,
  timeframe: Timeframe,
  outputSize: 'compact' | 'full' = 'compact'
): Promise<CandleData[]> {
  const { from, to } = parseForexSymbol(symbol);
  const apiKey = getApiKey();

  const isIntraday = ['1min', '5min', '15min', '30min', '60min'].includes(timeframe);
  const isDaily = timeframe === 'daily';
  const isWeekly = timeframe === 'weekly';
  const isMonthly = timeframe === 'monthly';

  let params: Record<string, string>;

  if (isIntraday) {
    params = {
      function: 'FX_INTRADAY',
      from_symbol: from,
      to_symbol: to,
      interval: avTimeframe(timeframe),
      outputsize: outputSize,
      apikey: apiKey,
    };
  } else if (isDaily) {
    params = {
      function: 'FX_DAILY',
      from_symbol: from,
      to_symbol: to,
      outputsize: outputSize,
      apikey: apiKey,
    };
  } else if (isWeekly) {
    params = {
      function: 'FX_WEEKLY',
      from_symbol: from,
      to_symbol: to,
      apikey: apiKey,
    };
  } else {
    params = {
      function: 'FX_MONTHLY',
      from_symbol: from,
      to_symbol: to,
      apikey: apiKey,
    };
  }

  const res = await axios.get(BASE_URL, { params, timeout: 30000 });
  const data = res.data;

  if (data['Note']) throw new Error('Alpha Vantage rate limit reached. Wait 1 minute.');
  if (data['Information']) throw new Error(data['Information']);

  // Find the time series key
  const tsKey = Object.keys(data).find((k) => k.startsWith('Time Series'));
  if (!tsKey) {
    console.error('Alpha Vantage response:', JSON.stringify(data).slice(0, 500));
    throw new Error('No time series data in response');
  }

  const timeSeries = data[tsKey] as Record<string, Record<string, string>>;

  const candles: CandleData[] = Object.entries(timeSeries)
    .map(([dateStr, ohlc]) => ({
      time: Math.floor(new Date(dateStr).getTime() / 1000),
      open: parseFloat(ohlc['1. open']),
      high: parseFloat(ohlc['2. high']),
      low: parseFloat(ohlc['3. low']),
      close: parseFloat(ohlc['4. close']),
    }))
    .sort((a, b) => a.time - b.time);

  return candles;
}

export async function fetchForexQuote(symbol: string): Promise<{
  price: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  change: number;
  changePct: number;
}> {
  const { from, to } = parseForexSymbol(symbol);
  const apiKey = getApiKey();

  const res = await axios.get(BASE_URL, {
    params: {
      function: 'CURRENCY_EXCHANGE_RATE',
      from_currency: from,
      to_currency: to,
      apikey: apiKey,
    },
    timeout: 15000,
  });

  const rate = res.data['Realtime Currency Exchange Rate'];
  if (!rate) {
    if (res.data['Note']) throw new Error('Alpha Vantage rate limit reached.');
    throw new Error('Could not fetch quote data');
  }

  const price = parseFloat(rate['5. Exchange Rate']);
  const bid = parseFloat(rate['8. Bid Price']) || price;
  const ask = parseFloat(rate['9. Ask Price']) || price;

  return { price, bid, ask, high: ask * 1.001, low: bid * 0.999, change: 0, changePct: 0 };
}

export async function fetchForexNews(
  keywords: string = 'forex currency trading',
  limit = 20
): Promise<NewsItem[]> {
  const apiKey = getApiKey();

  const res = await axios.get(BASE_URL, {
    params: {
      function: 'NEWS_SENTIMENT',
      topics: 'forex',
      limit,
      sort: 'LATEST',
      apikey: apiKey,
    },
    timeout: 20000,
  });

  const data = res.data;
  if (data['Note'] || !data.feed) return [];

  return (data.feed as Array<Record<string, unknown>>).map((item) => ({
    title: String(item.title ?? ''),
    summary: String(item.summary ?? ''),
    url: String(item.url ?? ''),
    source: String(item.source ?? ''),
    sentiment: mapSentiment(String(item.overall_sentiment_label ?? 'Neutral')),
    sentimentScore: parseFloat(String(item.overall_sentiment_score ?? '0')),
    publishedAt: String(item.time_published ?? ''),
    tickers: Array.isArray(item.ticker_sentiment)
      ? (item.ticker_sentiment as Array<{ ticker: string }>).map((t) => t.ticker)
      : [],
  }));
}

function mapSentiment(label: string): NewsItem['sentiment'] {
  const map: Record<string, NewsItem['sentiment']> = {
    Bullish: 'Bullish',
    'Somewhat-Bullish': 'Somewhat-Bullish',
    Neutral: 'Neutral',
    'Somewhat-Bearish': 'Somewhat-Bearish',
    Bearish: 'Bearish',
  };
  return map[label] ?? 'Neutral';
}

// Fetch economic indicators (for macro analyst)
export async function fetchEconomicData(indicator: string): Promise<{ date: string; value: number }[]> {
  const apiKey = getApiKey();
  const functionMap: Record<string, string> = {
    cpi: 'CPI',
    gdp: 'REAL_GDP',
    unemployment: 'UNEMPLOYMENT',
    federal_funds_rate: 'FEDERAL_FUNDS_RATE',
    inflation: 'INFLATION',
  };

  const fn = functionMap[indicator.toLowerCase()];
  if (!fn) return [];

  const res = await axios.get(BASE_URL, {
    params: { function: fn, apikey: apiKey },
    timeout: 15000,
  });

  const data = res.data?.data ?? [];
  return (data as Array<{ date: string; value: string }>)
    .slice(0, 12)
    .map((d) => ({ date: d.date, value: parseFloat(d.value) || 0 }));
}
