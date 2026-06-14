'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIProvider, AppSettings, Timeframe } from '@/types';

interface SettingsState extends AppSettings {
  setApiKey: (provider: keyof AppSettings['apiKeys'], key: string) => void;
  setAIProvider: (provider: AIProvider) => void;
  setAIModel: (model: string) => void;
  setInitialCapital: (amount: number) => void;
  setRiskPerTrade: (pct: number) => void;
  setAutoTrade: (enabled: boolean) => void;
  setAnalysisInterval: (seconds: number) => void;
  setDefaultSymbol: (symbol: string) => void;
  setDefaultTimeframe: (tf: Timeframe) => void;
}

const AI_MODELS: Record<AIProvider, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  google: 'gemini-1.5-pro',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      aiProvider: (process.env.NEXT_PUBLIC_DEFAULT_AI_PROVIDER as AIProvider) || 'anthropic',
      aiModel: AI_MODELS['anthropic'],
      apiKeys: {
        alphavantage: '',
        anthropic: '',
        openai: '',
        google: '',
      },
      initialCapital: 10000,
      riskPerTrade: 2,
      autoTrade: false,
      analysisInterval: 60,
      defaultSymbol: 'EUR/USD',
      defaultTimeframe: '60min',

      setApiKey: (provider, key) =>
        set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),

      setAIProvider: (provider) =>
        set({ aiProvider: provider, aiModel: AI_MODELS[provider] }),

      setAIModel: (model) => set({ aiModel: model }),

      setInitialCapital: (amount) => set({ initialCapital: amount }),

      setRiskPerTrade: (pct) => set({ riskPerTrade: pct }),

      setAutoTrade: (enabled) => set({ autoTrade: enabled }),

      setAnalysisInterval: (seconds) => set({ analysisInterval: seconds }),

      setDefaultSymbol: (symbol) => set({ defaultSymbol: symbol }),

      setDefaultTimeframe: (tf) => set({ defaultTimeframe: tf }),
    }),
    {
      name: 'forex-agent-settings',
    }
  )
);
