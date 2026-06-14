// ─── Market Data ──────────────────────────────────────────────────────────────

export interface CandleData {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface QuoteData {
  symbol: string;
  bid: number;
  ask: number;
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  timestamp: number;
}

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral' | 'Somewhat-Bullish' | 'Somewhat-Bearish';
  sentimentScore: number;
  publishedAt: string;
  tickers: string[];
}

// ─── Indicators ───────────────────────────────────────────────────────────────

export interface RSIData {
  time: number;
  value: number;
}

export interface MACDData {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerData {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export interface FibonacciLevel {
  level: number; // e.g. 0.236, 0.382, 0.5, 0.618
  price: number;
  label: string;
}

export interface FibonacciRetracement {
  swingHigh: number;
  swingLow: number;
  levels: FibonacciLevel[];
  direction: 'up' | 'down';
}

export interface EMAData {
  time: number;
  value: number;
}

// ─── Trading ──────────────────────────────────────────────────────────────────

export type TradeDirection = 'BUY' | 'SELL';
export type OrderStatus = 'OPEN' | 'CLOSED' | 'CANCELLED' | 'PENDING';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';

export interface Position {
  id: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  currentPrice: number;
  size: number; // in units / lots
  stopLoss?: number;
  takeProfit?: number;
  openedAt: number;
  pnl: number;
  pnlPct: number;
  agentId?: string; // which agent opened this
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  size: number;
  openedAt: number;
  closedAt: number;
  pnl: number;
  pnlPct: number;
  agentId?: string;
  reason?: string;
}

export interface PortfolioStats {
  balance: number;
  equity: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalTrades: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

// ─── Agents ───────────────────────────────────────────────────────────────────

export type AgentType =
  | 'technical_analyst'
  | 'sentiment_analyst'
  | 'risk_manager'
  | 'macro_analyst'
  | 'coordinator';

export type AgentStatus = 'idle' | 'analyzing' | 'waiting' | 'active' | 'disabled';

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  status: AgentStatus;
  enabled: boolean;
  lastAnalysis?: string;
  confidence?: number;
  signal?: 'BUY' | 'SELL' | 'HOLD';
  model?: string;
}

export interface AgentMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentType: AgentType;
  content: string;
  timestamp: number;
  type: 'analysis' | 'signal' | 'risk' | 'decision' | 'info' | 'debate';
}

// These interfaces use snake_case keys to match AI JSON output directly
export interface TechnicalAnalysis {
  trend: 'bullish' | 'bearish' | 'neutral' | 'ranging';
  strength: number;
  rsi_interpretation?: string;
  macd_signal?: 'bullish' | 'bearish' | 'neutral';
  bollinger_position?: string;
  fibonacci_nearest?: string;
  key_levels?: string[];
  patterns: string[];
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  entry?: number;
  stop_loss?: number;
  take_profit?: number;
}

export interface SentimentAnalysis {
  overall_sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  sentiment_score: number;
  key_themes?: string[];
  risk_environment?: string;
  notable_news?: string;
  fundamental_bias?: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
}

export interface RiskAnalysis {
  approved: boolean;
  risk_per_trade?: number;
  recommended_size: number;
  stop_loss: number;
  take_profit: number;
  risk_reward_ratio: number;
  margin_required?: number;
  max_acceptable_loss?: number;
  risk_grade?: 'low' | 'medium' | 'high' | 'extreme';
  reasoning: string;
}

export interface CoordinatorDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  symbol: string;
  entry: number;
  stop_loss: number;
  take_profit: number;
  size: number;
  confidence: number;
  reasoning?: string;
  trade_rationale?: string;
  technical_weight?: number;
  sentiment_weight?: number;
  agent_consensus?: string;
  key_catalysts?: string[];
  risk_reward?: number;
  expected_duration?: string;
  invalidation?: string;
}

export interface AnalysisResult {
  id: string;
  symbol: string;
  timeframe: string;
  timestamp: number;
  technical?: TechnicalAnalysis;
  sentiment?: SentimentAnalysis;
  risk?: RiskAnalysis;
  decision?: CoordinatorDecision;
  messages: AgentMessage[];
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export type AIProvider = 'anthropic' | 'openai' | 'google';

export type Timeframe =
  | '1min'
  | '5min'
  | '15min'
  | '30min'
  | '60min'
  | 'daily'
  | 'weekly'
  | 'monthly';

export interface AppSettings {
  aiProvider: AIProvider;
  aiModel: string;
  apiKeys: {
    alphavantage: string;
    anthropic: string;
    openai: string;
    google: string;
  };
  initialCapital: number;
  riskPerTrade: number; // percentage 1-5%
  autoTrade: boolean;
  analysisInterval: number; // seconds
  defaultSymbol: string;
  defaultTimeframe: Timeframe;
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export type ChartIndicator = 'rsi' | 'macd' | 'bollinger' | 'ema20' | 'ema50' | 'volume';

export interface ChartMarker {
  time: number;
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
  text: string;
  size?: number;
}

export interface ForexPair {
  symbol: string;
  from: string;
  to: string;
  displayName: string;
  pip: number;
  category: 'major' | 'minor' | 'exotic';
}
