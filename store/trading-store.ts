'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CandleData,
  QuoteData,
  Position,
  ClosedTrade,
  PortfolioStats,
  RSIData,
  MACDData,
  BollingerData,
  FibonacciRetracement,
  EMAData,
  ChartMarker,
  Timeframe,
} from '@/types';

interface TradingState {
  // Capital
  initialCapital: number;
  balance: number;
  equity: number;

  // Market data
  activePair: string;
  activeTimeframe: Timeframe;
  candles: CandleData[];
  quote: QuoteData | null;
  isLoadingCandles: boolean;
  isLoadingQuote: boolean;
  lastUpdate: number;

  // Indicators
  rsi: RSIData[];
  macd: MACDData[];
  bollinger: BollingerData[];
  ema20: EMAData[];
  ema50: EMAData[];
  ema200: EMAData[];
  fibonacci: FibonacciRetracement | null;

  // Chart markers (agent decisions)
  chartMarkers: ChartMarker[];

  // Positions
  positions: Position[];
  closedTrades: ClosedTrade[];
  stats: PortfolioStats;

  // Actions
  setInitialCapital: (amount: number) => void;
  setActivePair: (pair: string) => void;
  setActiveTimeframe: (tf: Timeframe) => void;
  setCandles: (candles: CandleData[]) => void;
  setQuote: (quote: QuoteData) => void;
  setLoadingCandles: (loading: boolean) => void;
  setLoadingQuote: (loading: boolean) => void;
  setRSI: (data: RSIData[]) => void;
  setMACD: (data: MACDData[]) => void;
  setBollinger: (data: BollingerData[]) => void;
  setEMA: (period: 20 | 50 | 200, data: EMAData[]) => void;
  setFibonacci: (fib: FibonacciRetracement | null) => void;
  addChartMarker: (marker: ChartMarker) => void;
  clearChartMarkers: () => void;
  openPosition: (pos: Omit<Position, 'id' | 'pnl' | 'pnlPct' | 'currentPrice'>) => Position;
  closePosition: (id: string, exitPrice: number, reason?: string) => void;
  updatePositionPrices: (currentPrice: number) => void;
  resetPortfolio: (initialCapital: number) => void;
  recalcStats: () => void;
}

const defaultStats: PortfolioStats = {
  balance: 10000,
  equity: 10000,
  unrealizedPnl: 0,
  realizedPnl: 0,
  totalTrades: 0,
  winRate: 0,
  maxDrawdown: 0,
  sharpeRatio: 0,
};

export const useTradingStore = create<TradingState>()(
  persist(
    (set, get) => ({
      initialCapital: 10000,
      balance: 10000,
      equity: 10000,

      activePair: 'EUR/USD',
      activeTimeframe: '60min',
      candles: [],
      quote: null,
      isLoadingCandles: false,
      isLoadingQuote: false,
      lastUpdate: 0,

      rsi: [],
      macd: [],
      bollinger: [],
      ema20: [],
      ema50: [],
      ema200: [],
      fibonacci: null,

      chartMarkers: [],

      positions: [],
      closedTrades: [],
      stats: defaultStats,

      setInitialCapital: (amount) => {
        set({ initialCapital: amount, balance: amount, equity: amount, stats: { ...defaultStats, balance: amount, equity: amount } });
      },

      setActivePair: (pair) => set({ activePair: pair }),

      setActiveTimeframe: (tf) => set({ activeTimeframe: tf }),

      setCandles: (candles) => set({ candles, lastUpdate: Date.now() }),

      setQuote: (quote) => {
        set({ quote, lastUpdate: Date.now() });
        get().updatePositionPrices(quote.price);
      },

      setLoadingCandles: (loading) => set({ isLoadingCandles: loading }),

      setLoadingQuote: (loading) => set({ isLoadingQuote: loading }),

      setRSI: (data) => set({ rsi: data }),
      setMACD: (data) => set({ macd: data }),
      setBollinger: (data) => set({ bollinger: data }),
      setEMA: (period, data) => {
        if (period === 20) set({ ema20: data });
        else if (period === 50) set({ ema50: data });
        else set({ ema200: data });
      },
      setFibonacci: (fib) => set({ fibonacci: fib }),

      addChartMarker: (marker) =>
        set((s) => ({ chartMarkers: [...s.chartMarkers.slice(-50), marker] })),

      clearChartMarkers: () => set({ chartMarkers: [] }),

      openPosition: (pos) => {
        const id = `pos_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const newPos: Position = {
          ...pos,
          id,
          currentPrice: pos.entryPrice,
          pnl: 0,
          pnlPct: 0,
        };
        set((s) => {
          const newBalance = s.balance - pos.entryPrice * pos.size * 0.01; // margin
          return {
            positions: [...s.positions, newPos],
            balance: Math.max(0, newBalance),
          };
        });
        get().recalcStats();
        return newPos;
      },

      closePosition: (id, exitPrice, reason) => {
        const state = get();
        const pos = state.positions.find((p) => p.id === id);
        if (!pos) return;

        const pnl =
          pos.direction === 'BUY'
            ? (exitPrice - pos.entryPrice) * pos.size * 10000
            : (pos.entryPrice - exitPrice) * pos.size * 10000;

        const closedTrade: ClosedTrade = {
          id: pos.id,
          symbol: pos.symbol,
          direction: pos.direction,
          entryPrice: pos.entryPrice,
          exitPrice,
          size: pos.size,
          openedAt: pos.openedAt,
          closedAt: Date.now(),
          pnl,
          pnlPct: (pnl / state.balance) * 100,
          agentId: pos.agentId,
          reason,
        };

        set((s) => ({
          positions: s.positions.filter((p) => p.id !== id),
          closedTrades: [closedTrade, ...s.closedTrades].slice(0, 200),
          balance: s.balance + pnl + pos.entryPrice * pos.size * 0.01,
        }));
        get().recalcStats();
      },

      updatePositionPrices: (currentPrice) => {
        set((s) => {
          const updatedPositions = s.positions.map((pos) => {
            const pnl =
              pos.direction === 'BUY'
                ? (currentPrice - pos.entryPrice) * pos.size * 10000
                : (pos.entryPrice - currentPrice) * pos.size * 10000;
            return {
              ...pos,
              currentPrice,
              pnl,
              pnlPct: (pnl / s.balance) * 100,
            };
          });
          return { positions: updatedPositions };
        });
        get().recalcStats();
      },

      recalcStats: () => {
        const s = get();
        const unrealizedPnl = s.positions.reduce((sum, p) => sum + p.pnl, 0);
        const realizedPnl = s.closedTrades.reduce((sum, t) => sum + t.pnl, 0);
        const equity = s.balance + unrealizedPnl;
        const wins = s.closedTrades.filter((t) => t.pnl > 0).length;
        const winRate = s.closedTrades.length > 0 ? (wins / s.closedTrades.length) * 100 : 0;

        let peak = s.initialCapital;
        let maxDrawdown = 0;
        let running = s.initialCapital;
        for (const t of [...s.closedTrades].reverse()) {
          running += t.pnl;
          if (running > peak) peak = running;
          const dd = ((peak - running) / peak) * 100;
          if (dd > maxDrawdown) maxDrawdown = dd;
        }

        set({
          equity,
          stats: {
            balance: s.balance,
            equity,
            unrealizedPnl,
            realizedPnl,
            totalTrades: s.closedTrades.length,
            winRate,
            maxDrawdown,
            sharpeRatio: 0,
          },
        });
      },

      resetPortfolio: (initialCapital) => {
        set({
          initialCapital,
          balance: initialCapital,
          equity: initialCapital,
          positions: [],
          closedTrades: [],
          chartMarkers: [],
          stats: { ...defaultStats, balance: initialCapital, equity: initialCapital },
        });
      },
    }),
    {
      name: 'forex-trading-state',
      partialize: (s) => ({
        initialCapital: s.initialCapital,
        balance: s.balance,
        equity: s.equity,
        activePair: s.activePair,
        activeTimeframe: s.activeTimeframe,
        positions: s.positions,
        closedTrades: s.closedTrades.slice(0, 100),
        stats: s.stats,
      }),
    }
  )
);
