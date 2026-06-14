import type {
  CandleData,
  RSIData,
  MACDData,
  BollingerData,
  FibonacciRetracement,
  FibonacciLevel,
  EMAData,
} from '@/types';

// ─── EMA ──────────────────────────────────────────────────────────────────────

export function calcEMA(candles: CandleData[], period: number): EMAData[] {
  if (candles.length < period) return [];
  const k = 2 / (period + 1);
  const results: EMAData[] = [];
  let ema = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;
  results.push({ time: candles[period - 1].time, value: ema });
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    results.push({ time: candles[i].time, value: ema });
  }
  return results;
}

// ─── SMA ──────────────────────────────────────────────────────────────────────

export function calcSMA(candles: CandleData[], period: number): EMAData[] {
  const results: EMAData[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const sum = candles.slice(i - period + 1, i + 1).reduce((s, c) => s + c.close, 0);
    results.push({ time: candles[i].time, value: sum / period });
  }
  return results;
}

// ─── RSI ──────────────────────────────────────────────────────────────────────

export function calcRSI(candles: CandleData[], period = 14): RSIData[] {
  if (candles.length < period + 1) return [];
  const results: RSIData[] = [];
  const changes = candles.slice(1).map((c, i) => c.close - candles[i].close);

  let avgGain = changes.slice(0, period).filter((c) => c > 0).reduce((s, c) => s + c, 0) / period;
  let avgLoss = changes.slice(0, period).filter((c) => c < 0).reduce((s, c) => s + Math.abs(c), 0) / period;

  const firstRsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  results.push({ time: candles[period].time, value: parseFloat(firstRsi.toFixed(2)) });

  for (let i = period; i < changes.length; i++) {
    const gain = Math.max(0, changes[i]);
    const loss = Math.max(0, -changes[i]);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    results.push({ time: candles[i + 1].time, value: parseFloat(rsi.toFixed(2)) });
  }
  return results;
}

// ─── MACD ─────────────────────────────────────────────────────────────────────

export function calcMACD(
  candles: CandleData[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDData[] {
  const ema12 = calcEMA(candles, fastPeriod);
  const ema26 = calcEMA(candles, slowPeriod);

  // Align by time
  const ema26Map = new Map(ema26.map((e) => [e.time, e.value]));
  const macdLine = ema12
    .filter((e) => ema26Map.has(e.time))
    .map((e) => ({ time: e.time, value: e.value - ema26Map.get(e.time)! }));

  if (macdLine.length < signalPeriod) return [];

  const k = 2 / (signalPeriod + 1);
  let signal = macdLine.slice(0, signalPeriod).reduce((s, d) => s + d.value, 0) / signalPeriod;

  const results: MACDData[] = [];
  results.push({
    time: macdLine[signalPeriod - 1].time,
    macd: macdLine[signalPeriod - 1].value,
    signal,
    histogram: macdLine[signalPeriod - 1].value - signal,
  });

  for (let i = signalPeriod; i < macdLine.length; i++) {
    signal = macdLine[i].value * k + signal * (1 - k);
    results.push({
      time: macdLine[i].time,
      macd: macdLine[i].value,
      signal,
      histogram: macdLine[i].value - signal,
    });
  }
  return results;
}

// ─── Bollinger Bands ──────────────────────────────────────────────────────────

export function calcBollinger(candles: CandleData[], period = 20, stdDev = 2): BollingerData[] {
  const results: BollingerData[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const mean = slice.reduce((s, c) => s + c.close, 0) / period;
    const variance = slice.reduce((s, c) => s + Math.pow(c.close - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    results.push({
      time: candles[i].time,
      upper: mean + stdDev * std,
      middle: mean,
      lower: mean - stdDev * std,
    });
  }
  return results;
}

// ─── Fibonacci Retracement ────────────────────────────────────────────────────

const FIB_RATIOS = [
  { level: 0, label: '0%' },
  { level: 0.236, label: '23.6%' },
  { level: 0.382, label: '38.2%' },
  { level: 0.5, label: '50%' },
  { level: 0.618, label: '61.8%' },
  { level: 0.786, label: '78.6%' },
  { level: 1, label: '100%' },
];

export function calcFibonacci(candles: CandleData[], lookback = 50): FibonacciRetracement | null {
  if (candles.length < lookback) return null;
  const recent = candles.slice(-lookback);

  let swingHigh = -Infinity;
  let swingLow = Infinity;
  let highIdx = 0;
  let lowIdx = 0;

  recent.forEach((c, i) => {
    if (c.high > swingHigh) { swingHigh = c.high; highIdx = i; }
    if (c.low < swingLow) { swingLow = c.low; lowIdx = i; }
  });

  const direction: 'up' | 'down' = highIdx > lowIdx ? 'up' : 'down';
  const diff = swingHigh - swingLow;

  const levels: FibonacciLevel[] = FIB_RATIOS.map(({ level, label }) => {
    const price =
      direction === 'up'
        ? swingHigh - diff * level
        : swingLow + diff * level;
    return { level, price, label };
  });

  return { swingHigh, swingLow, levels, direction };
}

// ─── Candle Pattern Detection ─────────────────────────────────────────────────

export function detectPatterns(candles: CandleData[]): string[] {
  const patterns: string[] = [];
  if (candles.length < 3) return patterns;

  const [c3, c2, c1] = candles.slice(-3);
  const body1 = Math.abs(c1.close - c1.open);
  const body2 = Math.abs(c2.close - c2.open);
  const range1 = c1.high - c1.low;

  // Doji
  if (body1 < range1 * 0.1) patterns.push('Doji');

  // Hammer
  const lowerWick1 = Math.min(c1.open, c1.close) - c1.low;
  const upperWick1 = c1.high - Math.max(c1.open, c1.close);
  if (lowerWick1 > body1 * 2 && upperWick1 < body1 * 0.5) patterns.push('Hammer');

  // Shooting Star
  if (upperWick1 > body1 * 2 && lowerWick1 < body1 * 0.5) patterns.push('Shooting Star');

  // Engulfing
  if (c2.close < c2.open && c1.close > c1.open && c1.open < c2.close && c1.close > c2.open) {
    patterns.push('Bullish Engulfing');
  }
  if (c2.close > c2.open && c1.close < c1.open && c1.open > c2.close && c1.close < c2.open) {
    patterns.push('Bearish Engulfing');
  }

  // Morning Star / Evening Star (3 candles)
  if (c3 && c3.close < c3.open && body2 < Math.abs(c3.close - c3.open) * 0.5 && c1.close > c1.open && c1.close > c3.open) {
    patterns.push('Morning Star');
  }
  if (c3 && c3.close > c3.open && body2 < Math.abs(c3.close - c3.open) * 0.5 && c1.close < c1.open && c1.close < c3.open) {
    patterns.push('Evening Star');
  }

  // Marubozu (strong candle, small wicks)
  if (body1 > range1 * 0.9) {
    patterns.push(c1.close > c1.open ? 'Bullish Marubozu' : 'Bearish Marubozu');
  }

  return patterns;
}

// ─── Trend Strength ───────────────────────────────────────────────────────────

export function calcTrendStrength(
  candles: CandleData[],
  ema20: EMAData[],
  ema50: EMAData[]
): { trend: 'bullish' | 'bearish' | 'neutral' | 'ranging'; strength: number } {
  if (!ema20.length || !ema50.length) return { trend: 'neutral', strength: 50 };

  const lastEma20 = ema20[ema20.length - 1].value;
  const lastEma50 = ema50[ema50.length - 1].value;
  const lastClose = candles[candles.length - 1].close;

  const priceAboveEma20 = lastClose > lastEma20;
  const priceAboveEma50 = lastClose > lastEma50;
  const ema20AboveEma50 = lastEma20 > lastEma50;

  const diff = Math.abs(lastEma20 - lastEma50) / lastEma50;
  const strength = Math.min(100, 50 + diff * 10000);

  if (priceAboveEma20 && priceAboveEma50 && ema20AboveEma50) {
    return { trend: 'bullish', strength };
  }
  if (!priceAboveEma20 && !priceAboveEma50 && !ema20AboveEma50) {
    return { trend: 'bearish', strength };
  }
  if (diff < 0.001) return { trend: 'ranging', strength: 40 };
  return { trend: 'neutral', strength: 50 };
}

// ─── ATR (Average True Range) ─────────────────────────────────────────────────

export function calcATR(candles: CandleData[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs = candles.slice(1).map((c, i) => {
    const prev = candles[i].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev));
  });
  return trs.slice(-period).reduce((s, v) => s + v, 0) / period;
}
