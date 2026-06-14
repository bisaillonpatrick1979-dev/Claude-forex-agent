'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickSeriesOptions,
  type Time,
} from 'lightweight-charts';
import { useTradingStore } from '@/store/trading-store';
import type { ChartMarker } from '@/types';

interface TradingChartProps {
  showRSI?: boolean;
  showMACD?: boolean;
  showBollinger?: boolean;
  showEMA?: boolean;
  showVolume?: boolean;
  showFibonacci?: boolean;
}

const CHART_COLORS = {
  bg: '#0B0E11',
  grid: '#1C2230',
  border: '#2A2E3D',
  text: '#787B86',
  crosshair: '#444',
  upCandle: '#089981',
  downCandle: '#F23645',
  upWick: '#089981',
  downWick: '#F23645',
};

export default function TradingChart({
  showRSI = true,
  showMACD = false,
  showBollinger = true,
  showEMA = true,
  showFibonacci = true,
}: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMidRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema20Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);

  const { candles, rsi, macd, bollinger, ema20, ema50, fibonacci, chartMarkers } = useTradingStore();

  const createMainChart = useCallback(() => {
    if (!mainContainerRef.current) return;

    const chart = createChart(mainContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.bg },
        textColor: CHART_COLORS.text,
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid, style: LineStyle.Solid },
        horzLines: { color: CHART_COLORS.grid, style: LineStyle.Solid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: CHART_COLORS.crosshair, style: LineStyle.Dashed, width: 1 },
        horzLine: { color: CHART_COLORS.crosshair, style: LineStyle.Dashed, width: 1 },
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.border,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: CHART_COLORS.border,
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: CHART_COLORS.upCandle,
      downColor: CHART_COLORS.downCandle,
      borderUpColor: CHART_COLORS.upCandle,
      borderDownColor: CHART_COLORS.downCandle,
      wickUpColor: CHART_COLORS.upWick,
      wickDownColor: CHART_COLORS.downWick,
    } as Partial<CandlestickSeriesOptions>);
    candleSeriesRef.current = candleSeries;

    // Bollinger Bands
    if (showBollinger) {
      bbUpperRef.current = chart.addLineSeries({
        color: 'rgba(41, 98, 255, 0.6)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'BB Upper',
        priceLineVisible: false,
        lastValueVisible: false,
      });
      bbMidRef.current = chart.addLineSeries({
        color: 'rgba(41, 98, 255, 0.9)',
        lineWidth: 1,
        title: 'BB Mid',
        priceLineVisible: false,
        lastValueVisible: false,
      });
      bbLowerRef.current = chart.addLineSeries({
        color: 'rgba(41, 98, 255, 0.6)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'BB Lower',
        priceLineVisible: false,
        lastValueVisible: false,
      });
    }

    // EMA lines
    if (showEMA) {
      ema20Ref.current = chart.addLineSeries({
        color: '#F7A600',
        lineWidth: 1,
        title: 'EMA 20',
        priceLineVisible: false,
        lastValueVisible: true,
      });
      ema50Ref.current = chart.addLineSeries({
        color: '#9C27B0',
        lineWidth: 1,
        title: 'EMA 50',
        priceLineVisible: false,
        lastValueVisible: true,
      });
    }

    return chart;
  }, [showBollinger, showEMA]);

  const createRSIChart = useCallback(() => {
    if (!rsiContainerRef.current || !showRSI) return;

    const chart = createChart(rsiContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.bg },
        textColor: CHART_COLORS.text,
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: CHART_COLORS.border, scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: CHART_COLORS.border, timeVisible: true, visible: false },
    });

    rsiChartRef.current = chart;

    // RSI overbought/oversold reference lines
    const rsiSeries = chart.addLineSeries({
      color: '#2962FF',
      lineWidth: 1,
      title: 'RSI(14)',
      priceLineVisible: false,
    });
    rsiSeriesRef.current = rsiSeries;

    // Overbought line at 70
    chart.addLineSeries({
      color: 'rgba(242,54,69,0.5)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // Oversold line at 30
    chart.addLineSeries({
      color: 'rgba(8,153,129,0.5)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    return chart;
  }, [showRSI]);

  const createMACDChart = useCallback(() => {
    if (!macdContainerRef.current || !showMACD) return;

    const chart = createChart(macdContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.bg },
        textColor: CHART_COLORS.text,
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: CHART_COLORS.border, scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: CHART_COLORS.border, timeVisible: true },
    });

    macdChartRef.current = chart;

    macdSeriesRef.current = chart.addHistogramSeries({
      color: '#2962FF',
      priceLineVisible: false,
    });

    macdLineRef.current = chart.addLineSeries({
      color: '#2962FF',
      lineWidth: 1,
      title: 'MACD',
      priceLineVisible: false,
    });

    macdSignalRef.current = chart.addLineSeries({
      color: '#F7A600',
      lineWidth: 1,
      title: 'Signal',
      priceLineVisible: false,
    });

    return chart;
  }, [showMACD]);

  // Initialize charts
  useEffect(() => {
    createMainChart();
    if (showRSI) createRSIChart();
    if (showMACD) createMACDChart();

    const handleResize = () => {
      if (mainContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: mainContainerRef.current.clientWidth,
          height: mainContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.remove();
      rsiChartRef.current?.remove();
      macdChartRef.current?.remove();
    };
  }, [createMainChart, createRSIChart, createMACDChart, showRSI, showMACD]);

  // Update candle data
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;
    const chartData = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current.setData(chartData);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // Update Bollinger Bands
  useEffect(() => {
    if (!showBollinger || !bbUpperRef.current || bollinger.length === 0) return;
    const upper = bollinger.map((b) => ({ time: b.time as Time, value: b.upper }));
    const mid = bollinger.map((b) => ({ time: b.time as Time, value: b.middle }));
    const lower = bollinger.map((b) => ({ time: b.time as Time, value: b.lower }));
    bbUpperRef.current?.setData(upper);
    bbMidRef.current?.setData(mid);
    bbLowerRef.current?.setData(lower);
  }, [bollinger, showBollinger]);

  // Update EMAs
  useEffect(() => {
    if (!showEMA) return;
    if (ema20Ref.current && ema20.length > 0) {
      ema20Ref.current.setData(ema20.map((e) => ({ time: e.time as Time, value: e.value })));
    }
    if (ema50Ref.current && ema50.length > 0) {
      ema50Ref.current.setData(ema50.map((e) => ({ time: e.time as Time, value: e.value })));
    }
  }, [ema20, ema50, showEMA]);

  // Update RSI
  useEffect(() => {
    if (!showRSI || !rsiSeriesRef.current || rsi.length === 0) return;
    rsiSeriesRef.current.setData(rsi.map((r) => ({ time: r.time as Time, value: r.value })));

    // Update reference lines
    const charts = rsiChartRef.current;
    if (charts && rsi.length > 0) {
      const allSeries = (charts as unknown as { _private?: unknown })['_private'];
      // Add overbought/oversold as price lines on RSI series
      rsiSeriesRef.current.createPriceLine({ price: 70, color: 'rgba(242,54,69,0.6)', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'OB' });
      rsiSeriesRef.current.createPriceLine({ price: 30, color: 'rgba(8,153,129,0.6)', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'OS' });
      rsiSeriesRef.current.createPriceLine({ price: 50, color: 'rgba(120,123,134,0.3)', lineWidth: 1, lineStyle: LineStyle.Dashed, title: '' });
    }
  }, [rsi, showRSI]);

  // Update MACD
  useEffect(() => {
    if (!showMACD || !macdSeriesRef.current || macd.length === 0) return;
    macdSeriesRef.current.setData(
      macd.map((m) => ({
        time: m.time as Time,
        value: m.histogram,
        color: m.histogram >= 0 ? 'rgba(8,153,129,0.7)' : 'rgba(242,54,69,0.7)',
      }))
    );
    macdLineRef.current?.setData(macd.map((m) => ({ time: m.time as Time, value: m.macd })));
    macdSignalRef.current?.setData(macd.map((m) => ({ time: m.time as Time, value: m.signal })));
  }, [macd, showMACD]);

  // Draw Fibonacci levels on chart
  useEffect(() => {
    if (!showFibonacci || !candleSeriesRef.current || !fibonacci) return;

    // Remove existing Fibonacci price lines by recreating with latest data
    const fibColors = ['#787B86', '#F7A600', '#2962FF', '#F7A600', '#F23645', '#9C27B0', '#787B86'];
    fibonacci.levels.forEach((level, i) => {
      candleSeriesRef.current!.createPriceLine({
        price: level.price,
        color: fibColors[i] ?? '#787B86',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: `Fib ${level.label}`,
        axisLabelVisible: true,
      });
    });
  }, [fibonacci, showFibonacci]);

  // Add chart markers (agent signals)
  useEffect(() => {
    if (!candleSeriesRef.current || chartMarkers.length === 0) return;
    const markers = chartMarkers.map((m: ChartMarker) => ({
      time: m.time as Time,
      position: m.position,
      color: m.color,
      shape: m.shape,
      text: m.text,
      size: m.size ?? 1,
    }));
    // Sort by time
    markers.sort((a, b) => (a.time as number) - (b.time as number));
    candleSeriesRef.current.setMarkers(markers);
  }, [chartMarkers]);

  const hasRSI = showRSI && rsi.length > 0;
  const hasMACD = showMACD && macd.length > 0;

  return (
    <div ref={containerRef} className="flex flex-col w-full h-full bg-[#0B0E11]">
      {/* Main candlestick chart */}
      <div
        ref={mainContainerRef}
        className="flex-1 min-h-0"
        style={{ height: hasRSI && hasMACD ? '65%' : hasRSI || hasMACD ? '75%' : '100%' }}
      />

      {/* RSI panel */}
      {showRSI && (
        <div className="border-t border-[#2A2E3D]" style={{ height: hasMACD ? '18%' : '25%' }}>
          <div className="flex items-center gap-2 px-2 py-0.5 bg-[#131722]">
            <span className="text-[10px] text-[#787B86] font-mono">RSI(14)</span>
            {rsi.length > 0 && (
              <span
                className="text-[10px] font-mono font-semibold"
                style={{
                  color:
                    rsi[rsi.length - 1].value > 70
                      ? '#F23645'
                      : rsi[rsi.length - 1].value < 30
                      ? '#089981'
                      : '#2962FF',
                }}
              >
                {rsi[rsi.length - 1].value.toFixed(2)}
              </span>
            )}
          </div>
          <div ref={rsiContainerRef} className="w-full" style={{ height: 'calc(100% - 22px)' }} />
        </div>
      )}

      {/* MACD panel */}
      {showMACD && (
        <div className="border-t border-[#2A2E3D]" style={{ height: '17%' }}>
          <div className="flex items-center gap-2 px-2 py-0.5 bg-[#131722]">
            <span className="text-[10px] text-[#787B86] font-mono">MACD(12,26,9)</span>
            {macd.length > 0 && (
              <span
                className="text-[10px] font-mono font-semibold"
                style={{ color: macd[macd.length - 1].histogram >= 0 ? '#089981' : '#F23645' }}
              >
                {macd[macd.length - 1].histogram.toFixed(5)}
              </span>
            )}
          </div>
          <div ref={macdContainerRef} className="w-full" style={{ height: 'calc(100% - 22px)' }} />
        </div>
      )}
    </div>
  );
}
