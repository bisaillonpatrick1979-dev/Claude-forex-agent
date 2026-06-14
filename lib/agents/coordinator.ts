import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import type {
  CandleData,
  RSIData,
  MACDData,
  BollingerData,
  FibonacciRetracement,
  NewsItem,
  AIProvider,
  AgentMessage,
  AnalysisResult,
  TechnicalAnalysis,
  SentimentAnalysis,
  RiskAnalysis,
  CoordinatorDecision,
  AgentType,
} from '@/types';
import {
  TECHNICAL_ANALYST_PROMPT,
  SENTIMENT_ANALYST_PROMPT,
  RISK_MANAGER_PROMPT,
  MACRO_ANALYST_PROMPT,
  COORDINATOR_PROMPT,
} from './prompts';

function getModel(provider: AIProvider, modelId: string) {
  switch (provider) {
    case 'anthropic':
      return anthropic(modelId);
    case 'openai':
      return openai(modelId);
    case 'google':
      return google(modelId);
    default:
      return anthropic('claude-sonnet-4-6');
  }
}

function safeParseJSON<T>(text: string): T | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

interface AgentRunContext {
  provider: AIProvider;
  modelId: string;
  symbol: string;
  timeframe: string;
  candles: CandleData[];
  rsi: RSIData[];
  macd: MACDData[];
  bollinger: BollingerData[];
  fibonacci: FibonacciRetracement | null;
  news: NewsItem[];
  balance: number;
  equity: number;
  patterns: string[];
  trend: string;
  trendStrength: number;
  atr: number;
}

export async function runAgentAnalysis(
  ctx: AgentRunContext,
  onMessage: (msg: Omit<AgentMessage, 'id' | 'timestamp'>) => void
): Promise<AnalysisResult> {
  const resultId = `analysis_${Date.now()}`;
  const messages: AgentMessage[] = [];

  const addMsg = (
    agentId: string,
    agentName: string,
    agentType: AgentType,
    content: string,
    type: AgentMessage['type']
  ) => {
    const msg: Omit<AgentMessage, 'id' | 'timestamp'> = {
      agentId,
      agentName,
      agentType,
      content,
      type,
    };
    onMessage(msg);
    messages.push({ ...msg, id: `${resultId}_${messages.length}`, timestamp: Date.now() });
  };

  const model = getModel(ctx.provider, ctx.modelId);
  const lastCandle = ctx.candles[ctx.candles.length - 1];
  const lastRSI = ctx.rsi[ctx.rsi.length - 1]?.value ?? 50;
  const lastMACD = ctx.macd[ctx.macd.length - 1];
  const lastBB = ctx.bollinger[ctx.bollinger.length - 1];
  const lastClose = lastCandle?.close ?? 0;

  const fibLevels =
    ctx.fibonacci?.levels.map((l) => `${l.label}: ${l.price.toFixed(5)}`).join(', ') ?? 'N/A';

  // ─── 1. Technical Analyst ─────────────────────────────────────────────────
  addMsg('technical_analyst', 'Analyste Technique', 'technical_analyst',
    `Demarrage de l'analyse technique pour ${ctx.symbol} (${ctx.timeframe})...`, 'info');

  const rsiStatus = lastRSI > 70 ? 'OVERBOUGHT' : lastRSI < 30 ? 'OVERSOLD' : 'NEUTRAL';
  const techContext = [
    `Symbol: ${ctx.symbol} | Timeframe: ${ctx.timeframe}`,
    `Current Price: ${lastClose.toFixed(5)}`,
    `ATR: ${ctx.atr.toFixed(5)}`,
    '',
    'Recent candles (last 5):',
    ...ctx.candles.slice(-5).map(
      (c) =>
        `  ${new Date(c.time * 1000).toISOString().slice(0, 16)}: O:${c.open.toFixed(5)} H:${c.high.toFixed(5)} L:${c.low.toFixed(5)} C:${c.close.toFixed(5)}`
    ),
    '',
    'Indicators:',
    `- RSI(14): ${lastRSI.toFixed(2)} [${rsiStatus}]`,
    `- MACD: ${lastMACD ? `MACD=${lastMACD.macd.toFixed(5)}, Signal=${lastMACD.signal.toFixed(5)}, Histogram=${lastMACD.histogram.toFixed(5)}` : 'N/A'}`,
    `- Bollinger Bands: ${lastBB ? `Upper=${lastBB.upper.toFixed(5)}, Middle=${lastBB.middle.toFixed(5)}, Lower=${lastBB.lower.toFixed(5)}` : 'N/A'}`,
    `- Trend: ${ctx.trend} (Strength: ${ctx.trendStrength.toFixed(0)}/100)`,
    `- Fibonacci Levels: ${fibLevels}`,
    `- Detected Patterns: ${ctx.patterns.join(', ') || 'None'}`,
  ].join('\n');

  let technical: TechnicalAnalysis | null = null;
  try {
    const techResult = await generateText({
      model,
      system: TECHNICAL_ANALYST_PROMPT,
      messages: [{ role: 'user', content: techContext }],
      maxOutputTokens: 600,
      temperature: 0.2,
    });
    technical = safeParseJSON<TechnicalAnalysis>(techResult.text);
    if (technical) {
      addMsg(
        'technical_analyst', 'Analyste Technique', 'technical_analyst',
        `Signal: **${technical.signal}** | Confiance: ${technical.confidence}% | Tendance: ${technical.trend}\n\n${technical.reasoning}`,
        'analysis'
      );
    }
  } catch (err) {
    addMsg('technical_analyst', 'Analyste Technique', 'technical_analyst',
      `Erreur: ${err instanceof Error ? err.message : 'Unknown error'}`, 'info');
  }

  // ─── 2. Sentiment Analyst ─────────────────────────────────────────────────
  addMsg('sentiment_analyst', 'Analyste Sentiment', 'sentiment_analyst',
    `Analyse du sentiment du marche et des actualites...`, 'info');

  const sentimentContext = [
    `Symbol: ${ctx.symbol}`,
    `Recent News (${ctx.news.length} articles):`,
    ...ctx.news.slice(0, 8).map(
      (n) => `- [${n.sentiment}] ${n.title}\n  ${n.summary.slice(0, 150)}...`
    ),
    '',
    `Technical context: Trend is ${ctx.trend}, RSI at ${lastRSI.toFixed(1)}`,
  ].join('\n');

  let sentiment: SentimentAnalysis | null = null;
  try {
    const sentResult = await generateText({
      model,
      system: SENTIMENT_ANALYST_PROMPT,
      messages: [{ role: 'user', content: sentimentContext }],
      maxOutputTokens: 500,
      temperature: 0.3,
    });
    sentiment = safeParseJSON<SentimentAnalysis>(sentResult.text);
    if (sentiment) {
      addMsg(
        'sentiment_analyst', 'Analyste Sentiment', 'sentiment_analyst',
        `Sentiment: **${sentiment.overall_sentiment}** (Score: ${sentiment.sentiment_score.toFixed(2)}) | Signal: ${sentiment.signal}\n\n${sentiment.reasoning}`,
        'analysis'
      );
    }
  } catch (err) {
    addMsg('sentiment_analyst', 'Analyste Sentiment', 'sentiment_analyst',
      `Erreur sentiment: ${err instanceof Error ? err.message : 'Unknown error'}`, 'info');
  }

  // ─── 3. Risk Manager ──────────────────────────────────────────────────────
  addMsg('risk_manager', 'Gestionnaire de Risque', 'risk_manager',
    `Calcul de la taille de position et du risque...`, 'info');

  const riskContext = [
    `Symbol: ${ctx.symbol}`,
    `Account Balance: $${ctx.balance.toFixed(2)}`,
    `Account Equity: $${ctx.equity.toFixed(2)}`,
    `Current Price: ${lastClose.toFixed(5)}`,
    `ATR(14): ${ctx.atr.toFixed(5)}`,
    '',
    `Technical Signal: ${technical?.signal ?? 'HOLD'}`,
    `Technical Entry: ${technical?.entry ?? lastClose}`,
    `Technical SL: ${technical?.stop_loss ?? 'Not specified'}`,
    `Technical TP: ${technical?.take_profit ?? 'Not specified'}`,
    '',
    'Risk parameters: Max 2% risk per trade, minimum 1:2 risk/reward ratio',
  ].join('\n');

  let risk: RiskAnalysis | null = null;
  try {
    const riskResult = await generateText({
      model,
      system: RISK_MANAGER_PROMPT,
      messages: [{ role: 'user', content: riskContext }],
      maxOutputTokens: 400,
      temperature: 0.1,
    });
    risk = safeParseJSON<RiskAnalysis>(riskResult.text);
    if (risk) {
      addMsg(
        'risk_manager', 'Gestionnaire de Risque', 'risk_manager',
        `Risque: **${(risk.risk_grade ?? 'N/A').toUpperCase()}** | Approuve: ${risk.approved ? 'OUI' : 'NON'} | R/R: 1:${risk.risk_reward_ratio?.toFixed(1) ?? 'N/A'} | Taille: ${risk.recommended_size} lots\n\n${risk.reasoning}`,
        'risk'
      );
    }
  } catch (err) {
    addMsg('risk_manager', 'Gestionnaire de Risque', 'risk_manager',
      `Erreur risque: ${err instanceof Error ? err.message : 'Unknown error'}`, 'info');
  }

  // ─── 4. Macro Analyst ─────────────────────────────────────────────────────
  addMsg('macro_analyst', 'Analyste Macro', 'macro_analyst',
    `Analyse des facteurs macroeconomiques...`, 'info');

  const macroContext = [
    `Currency Pair: ${ctx.symbol}`,
    `Current Exchange Rate: ${lastClose.toFixed(5)}`,
    '',
    'Market context based on recent news:',
    ...ctx.news.slice(0, 5).map((n) => `- ${n.title}`),
    '',
    `Technical trend: ${ctx.trend} with strength ${ctx.trendStrength.toFixed(0)}/100`,
    `Current RSI: ${lastRSI.toFixed(1)}`,
  ].join('\n');

  let macro: {
    signal: string;
    confidence: number;
    macro_trend: string;
    reasoning: string;
    central_bank_stance?: string;
  } | null = null;

  try {
    const macroResult = await generateText({
      model,
      system: MACRO_ANALYST_PROMPT,
      messages: [{ role: 'user', content: macroContext }],
      maxOutputTokens: 400,
      temperature: 0.3,
    });
    macro = safeParseJSON(macroResult.text);
    if (macro) {
      addMsg(
        'macro_analyst', 'Analyste Macro', 'macro_analyst',
        `Macro: **${(macro.macro_trend ?? 'N/A').toUpperCase()}** | Signal: ${macro.signal} | Banque centrale: ${macro.central_bank_stance ?? 'N/A'}\n\n${macro.reasoning}`,
        'analysis'
      );
    }
  } catch (err) {
    addMsg('macro_analyst', 'Analyste Macro', 'macro_analyst',
      `Erreur macro: ${err instanceof Error ? err.message : 'Unknown error'}`, 'info');
  }

  // ─── 5. Coordinator ───────────────────────────────────────────────────────
  addMsg('coordinator', 'Coordinateur Stratege', 'coordinator',
    `Synthese de toutes les analyses en cours...`, 'debate');

  const coordContext = [
    `Symbol: ${ctx.symbol} | Price: ${lastClose.toFixed(5)} | Balance: $${ctx.balance.toFixed(2)}`,
    '',
    `TECHNICAL ANALYST: ${technical
      ? `Signal=${technical.signal}, Confidence=${technical.confidence}%, Entry=${technical.entry ?? lastClose}, SL=${technical.stop_loss ?? 'N/A'}, TP=${technical.take_profit ?? 'N/A'}\nReasoning: ${technical.reasoning}`
      : 'Analysis failed'}`,
    '',
    `SENTIMENT ANALYST: ${sentiment
      ? `Signal=${sentiment.signal}, Confidence=${sentiment.confidence}%, Sentiment=${sentiment.overall_sentiment}\nReasoning: ${sentiment.reasoning}`
      : 'Analysis failed'}`,
    '',
    `RISK MANAGER: ${risk
      ? `Approved=${risk.approved}, Size=${risk.recommended_size} lots, SL=${risk.stop_loss}, TP=${risk.take_profit}, R/R=1:${risk.risk_reward_ratio}\nReasoning: ${risk.reasoning}`
      : 'Analysis failed'}`,
    '',
    `MACRO ANALYST: ${macro
      ? `Signal=${macro.signal}, Confidence=${macro.confidence}%, Trend=${macro.macro_trend}\nReasoning: ${macro.reasoning}`
      : 'Analysis failed'}`,
  ].join('\n');

  let decision: CoordinatorDecision | null = null;
  try {
    const coordResult = await generateText({
      model,
      system: COORDINATOR_PROMPT,
      messages: [{ role: 'user', content: coordContext }],
      maxOutputTokens: 700,
      temperature: 0.1,
    });
    decision = safeParseJSON<CoordinatorDecision>(coordResult.text);
    if (decision) {
      const actionLabel = decision.action === 'BUY' ? 'ACHAT' : decision.action === 'SELL' ? 'VENTE' : 'ATTENTE';
      addMsg(
        'coordinator', 'Coordinateur Stratege', 'coordinator',
        `DECISION FINALE: **${actionLabel}** | Confiance: ${decision.confidence}% | Entree: ${decision.entry?.toFixed(5)} | SL: ${decision.stop_loss?.toFixed(5)} | TP: ${decision.take_profit?.toFixed(5)} | Taille: ${decision.size} lots\n\n${decision.trade_rationale ?? decision.reasoning ?? ''}`,
        'decision'
      );
    }
  } catch (err) {
    addMsg('coordinator', 'Coordinateur Stratege', 'coordinator',
      `Erreur coordination: ${err instanceof Error ? err.message : 'Unknown error'}`, 'info');
  }

  return {
    id: resultId,
    symbol: ctx.symbol,
    timeframe: ctx.timeframe,
    timestamp: Date.now(),
    technical: technical ?? undefined,
    sentiment: sentiment ?? undefined,
    risk: risk ?? undefined,
    decision: decision ?? undefined,
    messages,
  };
}
