'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';
import Header from '@/components/dashboard/Header';
import ChartControls from '@/components/charts/ChartControls';
import AgentPanel from '@/components/agents/AgentPanel';
import AgentChat from '@/components/agents/AgentChat';
import PositionsPanel from '@/components/trading/PositionsPanel';
import PortfolioStats from '@/components/trading/PortfolioStats';
import OrderForm from '@/components/trading/OrderForm';
import { useTradingStore } from '@/store/trading-store';
import { useAgentsStore } from '@/store/agents-store';
import { useSettingsStore } from '@/store/settings-store';
import {
  calcRSI,
  calcMACD,
  calcBollinger,
  calcEMA,
  calcFibonacci,
  calcATR,
  detectPatterns,
  calcTrendStrength,
} from '@/lib/indicators';
import type { Timeframe, NewsItem, AnalysisResult } from '@/types';

const TradingChart = dynamic(() => import('@/components/charts/TradingChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0B0E11]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#2962FF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-[11px] text-[#787B86]">Chargement du graphique...</p>
      </div>
    </div>
  ),
});

export default function Dashboard() {
  const tradingStore = useTradingStore();
  const {
    candles,
    activePair,
    activeTimeframe,
    isLoadingCandles,
    isLoadingQuote,
    setCandles,
    setQuote,
    setActivePair,
    setActiveTimeframe,
    setLoadingCandles,
    setLoadingQuote,
    setRSI,
    setMACD,
    setBollinger,
    setEMA,
    setFibonacci,
    addChartMarker,
    balance,
    equity,
    positions,
    openPosition,
  } = tradingStore;

  const agentsStore = useAgentsStore();
  const {
    agents,
    isAnalyzing,
    setAnalyzing,
    addMessage,
    setAgentStatus,
    setAgentSignal,
    setLastAnalysis,
    clearMessages,
  } = agentsStore;

  const { aiProvider, aiModel, apiKeys, autoTrade, analysisInterval } = useSettingsStore();

  const [indicators, setIndicators] = useState({
    rsi: true,
    macd: false,
    bollinger: true,
    ema: true,
    fibonacci: true,
  });

  const [isConnected, setIsConnected] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [bottomPanel, setBottomPanel] = useState<'positions' | 'chat'>('chat');
  const quoteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const analysisTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadCandles = useCallback(async (pair: string, tf: Timeframe) => {
    setLoadingCandles(true);
    try {
      const res = await fetch(
        `/api/forex/candles?symbol=${encodeURIComponent(pair)}&timeframe=${tf}&outputSize=compact`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const newCandles = data.candles;
      setCandles(newCandles);
      setIsConnected(true);

      const rsi = calcRSI(newCandles, 14);
      const macd = calcMACD(newCandles, 12, 26, 9);
      const bb = calcBollinger(newCandles, 20, 2);
      const ema20 = calcEMA(newCandles, 20);
      const ema50 = calcEMA(newCandles, 50);
      const ema200 = calcEMA(newCandles, 200);
      const fib = calcFibonacci(newCandles, 50);

      setRSI(rsi);
      setMACD(macd);
      setBollinger(bb);
      setEMA(20, ema20);
      setEMA(50, ema50);
      setEMA(200, ema200);
      setFibonacci(fib);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de chargement';
      toast.error(
        msg.includes('rate limit')
          ? 'Limite Alpha Vantage atteinte. Attendez 1 minute.'
          : msg
      );
      setIsConnected(false);
    } finally {
      setLoadingCandles(false);
    }
  }, [setLoadingCandles, setCandles, setRSI, setMACD, setBollinger, setEMA, setFibonacci]);

  const loadQuote = useCallback(async () => {
    setLoadingQuote(true);
    try {
      const res = await fetch(`/api/forex/quote?symbol=${encodeURIComponent(activePair)}`);
      const data = await res.json();
      if (data.error) return;
      setQuote({
        symbol: activePair,
        price: data.quote.price,
        bid: data.quote.bid,
        ask: data.quote.ask,
        high: data.quote.high,
        low: data.quote.low,
        change: data.quote.change ?? 0,
        changePct: data.quote.changePct ?? 0,
        timestamp: data.timestamp,
      });
      setIsConnected(true);
    } catch {
      // Silently fail
    } finally {
      setLoadingQuote(false);
    }
  }, [activePair, setLoadingQuote, setQuote]);

  const loadNews = useCallback(async () => {
    try {
      const res = await fetch('/api/forex/news?limit=20');
      const data = await res.json();
      if (data.news) setNews(data.news);
    } catch {
      // ignore
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    if (isAnalyzing) return;

    const hasAiKey = apiKeys.anthropic || apiKeys.openai || apiKeys.google;
    if (!hasAiKey) {
      toast.error('Configurez une cle API IA dans les Parametres');
      return;
    }
    if (candles.length === 0) {
      toast.error('Chargez d\'abord les donnees du graphique');
      return;
    }

    clearMessages();
    setAnalyzing(true);
    agents.filter((a) => a.enabled).forEach((a) => setAgentStatus(a.id, 'analyzing'));

    const ema20 = calcEMA(candles, 20);
    const ema50 = calcEMA(candles, 50);
    const { trend, strength } = calcTrendStrength(candles, ema20, ema50);
    const patterns = detectPatterns(candles);
    const atr = calcATR(candles, 14);

    const apiKeyForProvider =
      aiProvider === 'anthropic' ? apiKeys.anthropic
      : aiProvider === 'openai' ? apiKeys.openai
      : apiKeys.google;

    const state = useTradingStore.getState();

    try {
      const res = await fetch('/api/agents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiProvider,
          modelId: aiModel,
          apiKey: apiKeyForProvider,
          symbol: activePair,
          timeframe: activeTimeframe,
          candles: candles.slice(-100),
          rsi: state.rsi.slice(-50),
          macd: state.macd.slice(-50),
          bollinger: state.bollinger.slice(-50),
          fibonacci: state.fibonacci,
          news: news.slice(0, 10),
          balance,
          equity,
          patterns,
          trend,
          trendStrength: strength,
          atr,
        }),
      });

      const result: AnalysisResult = await res.json();

      if ((result as { error?: string }).error) {
        throw new Error((result as { error?: string }).error);
      }

      // Push all messages to chat
      result.messages.forEach((msg) => addMessage(msg));

      // Update individual agent signals
      if (result.technical) {
        setAgentSignal(
          'technical_analyst',
          result.technical.signal,
          result.technical.confidence,
          result.technical.reasoning
        );
      }
      if (result.sentiment) {
        setAgentSignal(
          'sentiment_analyst',
          result.sentiment.signal,
          result.sentiment.confidence,
          result.sentiment.reasoning
        );
      }
      if (result.risk) {
        setAgentSignal(
          'risk_manager',
          result.risk.approved ? 'BUY' : 'HOLD',
          result.risk.approved ? 70 : 40,
          result.risk.reasoning
        );
      }
      if (result.decision) {
        setAgentSignal(
          'coordinator',
          result.decision.action,
          result.decision.confidence,
          result.decision.trade_rationale ?? result.decision.reasoning ?? ''
        );

        // Draw agent decision on chart
        const lastCandle = candles[candles.length - 1];
        if (lastCandle && result.decision.action !== 'HOLD') {
          addChartMarker({
            time: lastCandle.time,
            position: result.decision.action === 'BUY' ? 'belowBar' : 'aboveBar',
            color: result.decision.action === 'BUY' ? '#089981' : '#F23645',
            shape: result.decision.action === 'BUY' ? 'arrowUp' : 'arrowDown',
            text: `${result.decision.action} ${result.decision.confidence}%`,
            size: 2,
          });
        }

        // Auto-trade execution
        if (autoTrade && result.decision.action !== 'HOLD' && result.risk?.approved) {
          const pos = openPosition({
            symbol: activePair,
            direction: result.decision.action,
            entryPrice: result.decision.entry,
            size: result.decision.size ?? 0.01,
            stopLoss: result.decision.stop_loss,
            takeProfit: result.decision.take_profit,
            openedAt: Date.now(),
            agentId: 'coordinator',
          });
          toast.success(
            `Agent: ${result.decision.action} ${pos.size} lots @ ${pos.entryPrice.toFixed(5)}`
          );
        }
      }

      setLastAnalysis(result);
      toast.success('Analyse complete!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur d\'analyse';
      toast.error(msg);
    } finally {
      setAnalyzing(false);
      agents.forEach((a) => setAgentStatus(a.id, 'idle'));
    }
  }, [
    isAnalyzing, apiKeys, candles, clearMessages, setAnalyzing, agents, setAgentStatus,
    aiProvider, aiModel, activePair, activeTimeframe, news, balance, equity,
    addMessage, setAgentSignal, addChartMarker, autoTrade, setLastAnalysis, openPosition,
  ]);

  const handlePairChange = useCallback((pair: string) => {
    setActivePair(pair);
    loadCandles(pair, activeTimeframe);
  }, [setActivePair, activeTimeframe, loadCandles]);

  const handleTimeframeChange = useCallback((tf: Timeframe) => {
    setActiveTimeframe(tf);
    loadCandles(activePair, tf);
  }, [setActiveTimeframe, activePair, loadCandles]);

  const handleIndicatorToggle = useCallback((key: string, enabled: boolean) => {
    setIndicators((prev) => ({ ...prev, [key]: enabled }));
  }, []);

  // Initial load
  useEffect(() => {
    loadCandles(activePair, activeTimeframe);
    loadQuote();
    loadNews();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Quote refresh every 60s
  useEffect(() => {
    if (quoteTimerRef.current) clearInterval(quoteTimerRef.current);
    quoteTimerRef.current = setInterval(loadQuote, 60000);
    return () => { if (quoteTimerRef.current) clearInterval(quoteTimerRef.current); };
  }, [loadQuote]);

  // Auto-analysis timer
  useEffect(() => {
    if (!autoTrade || !analysisInterval) return;
    if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
    analysisTimerRef.current = setInterval(runAnalysis, analysisInterval * 1000);
    return () => { if (analysisTimerRef.current) clearInterval(analysisTimerRef.current); };
  }, [autoTrade, analysisInterval, runAnalysis]);

  const handleRefresh = useCallback(() => {
    loadCandles(activePair, activeTimeframe);
    loadQuote();
    loadNews();
  }, [activePair, activeTimeframe, loadCandles, loadQuote, loadNews]);

  return (
    <div className="flex flex-col h-screen bg-[#0B0E11] overflow-hidden">
      <Header
        onPairChange={handlePairChange}
        onRefresh={handleRefresh}
        isConnected={isConnected}
        isLoading={isLoadingCandles || isLoadingQuote}
      />

      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <aside className="w-52 flex-shrink-0 flex flex-col border-r border-[#2A2E3D] bg-[#131722] overflow-y-auto">
          <div className="border-b border-[#2A2E3D]">
            <div className="px-2 py-1.5 bg-[#0d1017]">
              <span className="text-[10px] font-semibold text-[#787B86] uppercase tracking-wider">
                Passer un Ordre
              </span>
            </div>
            <OrderForm />
          </div>
          <div>
            <div className="px-2 py-1.5 bg-[#0d1017] border-b border-[#2A2E3D]">
              <span className="text-[10px] font-semibold text-[#787B86] uppercase tracking-wider">
                Portfolio
              </span>
            </div>
            <PortfolioStats />
          </div>
        </aside>

        {/* Main chart area */}
        <main className="flex-1 flex flex-col min-w-0">
          <ChartControls
            onTimeframeChange={handleTimeframeChange}
            onIndicatorToggle={handleIndicatorToggle}
            indicators={indicators}
          />

          <div className="flex-1 min-h-0 relative">
            {isLoadingCandles && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0B0E11]/80 z-10">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-[#2962FF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-[11px] text-[#787B86]">Chargement des donnees...</p>
                </div>
              </div>
            )}
            <TradingChart
              showRSI={indicators.rsi}
              showMACD={indicators.macd}
              showBollinger={indicators.bollinger}
              showEMA={indicators.ema}
              showFibonacci={indicators.fibonacci}
            />
          </div>

          {/* Bottom panel */}
          <div className="h-[200px] flex-shrink-0 border-t border-[#2A2E3D] flex flex-col">
            <div className="flex border-b border-[#2A2E3D] bg-[#131722]">
              {[
                { key: 'chat', label: 'Discussion Agents' },
                { key: 'positions', label: `Positions (${positions.length})` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setBottomPanel(key as 'chat' | 'positions')}
                  className={`px-4 py-1.5 text-[11px] font-medium border-b-2 transition-colors ${
                    bottomPanel === key
                      ? 'border-[#2962FF] text-[#D1D4DC]'
                      : 'border-transparent text-[#787B86] hover:text-[#D1D4DC]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0">
              {bottomPanel === 'chat' ? <AgentChat /> : <PositionsPanel />}
            </div>
          </div>
        </main>

        {/* Right sidebar: Agents */}
        <aside className="w-60 flex-shrink-0 border-l border-[#2A2E3D]">
          <AgentPanel onAnalyze={runAnalysis} isAnalyzing={isAnalyzing} />
        </aside>
      </div>
    </div>
  );
}
