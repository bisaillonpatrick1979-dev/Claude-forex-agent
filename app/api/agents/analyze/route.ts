import { NextRequest, NextResponse } from 'next/server';
import { runAgentAnalysis } from '@/lib/agents/coordinator';
import type { AgentMessage } from '@/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      provider = 'anthropic',
      modelId = 'claude-sonnet-4-6',
      symbol,
      timeframe,
      candles,
      rsi,
      macd,
      bollinger,
      fibonacci,
      news,
      balance,
      equity,
      patterns,
      trend,
      trendStrength,
      atr,
    } = body;

    // Set API keys from request (sent from client-side settings)
    if (body.apiKey) {
      if (provider === 'anthropic') process.env.ANTHROPIC_API_KEY = body.apiKey;
      else if (provider === 'openai') process.env.OPENAI_API_KEY = body.apiKey;
      else if (provider === 'google') process.env.GOOGLE_GENERATIVE_AI_API_KEY = body.apiKey;
    }

    const collectedMessages: AgentMessage[] = [];

    const result = await runAgentAnalysis(
      {
        provider,
        modelId,
        symbol,
        timeframe,
        candles: candles ?? [],
        rsi: rsi ?? [],
        macd: macd ?? [],
        bollinger: bollinger ?? [],
        fibonacci: fibonacci ?? null,
        news: news ?? [],
        balance: balance ?? 10000,
        equity: equity ?? 10000,
        patterns: patterns ?? [],
        trend: trend ?? 'neutral',
        trendStrength: trendStrength ?? 50,
        atr: atr ?? 0,
      },
      (msg) => {
        collectedMessages.push({ ...msg, id: `${Date.now()}`, timestamp: Date.now() });
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Agent analysis failed';
    console.error('[Agents API]', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
