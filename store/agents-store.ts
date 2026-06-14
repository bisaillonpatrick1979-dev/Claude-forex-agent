'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Agent, AgentMessage, AnalysisResult, AgentType } from '@/types';

const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'technical_analyst',
    type: 'technical_analyst',
    name: 'Analyste Technique',
    description: 'Analyse les graphiques, patterns, RSI, MACD, Fibonacci et Bandes de Bollinger',
    status: 'idle',
    enabled: true,
  },
  {
    id: 'sentiment_analyst',
    type: 'sentiment_analyst',
    name: 'Analyste Sentiment',
    description: 'Analyse les nouvelles, actualités et sentiment du marché en temps réel',
    status: 'idle',
    enabled: true,
  },
  {
    id: 'risk_manager',
    type: 'risk_manager',
    name: 'Gestionnaire de Risque',
    description: 'Calcule la taille des positions, stop loss et ratio risque/rendement',
    status: 'idle',
    enabled: true,
  },
  {
    id: 'macro_analyst',
    type: 'macro_analyst',
    name: 'Analyste Macro',
    description: 'Analyse les données économiques, banques centrales et facteurs macro',
    status: 'idle',
    enabled: true,
  },
  {
    id: 'coordinator',
    type: 'coordinator',
    name: 'Coordinateur Stratège',
    description: 'Synthétise toutes les analyses et prend la décision finale de trading',
    status: 'idle',
    enabled: true,
  },
];

interface AgentsState {
  agents: Agent[];
  messages: AgentMessage[];
  isAnalyzing: boolean;
  lastAnalysis: AnalysisResult | null;
  analysisCount: number;

  toggleAgent: (id: string) => void;
  setAgentStatus: (id: string, status: Agent['status']) => void;
  setAgentSignal: (id: string, signal: Agent['signal'], confidence: number, analysis: string) => void;
  addMessage: (msg: Omit<AgentMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setAnalyzing: (v: boolean) => void;
  setLastAnalysis: (result: AnalysisResult) => void;
  resetAgents: () => void;
}

export const useAgentsStore = create<AgentsState>()(
  persist(
    (set, get) => ({
      agents: DEFAULT_AGENTS,
      messages: [],
      isAnalyzing: false,
      lastAnalysis: null,
      analysisCount: 0,

      toggleAgent: (id) =>
        set((s) => ({
          agents: s.agents.map((a) =>
            a.id === id ? { ...a, enabled: !a.enabled, status: a.enabled ? 'disabled' : 'idle' } : a
          ),
        })),

      setAgentStatus: (id, status) =>
        set((s) => ({
          agents: s.agents.map((a) => (a.id === id ? { ...a, status } : a)),
        })),

      setAgentSignal: (id, signal, confidence, analysis) =>
        set((s) => ({
          agents: s.agents.map((a) =>
            a.id === id ? { ...a, signal, confidence, lastAnalysis: analysis, status: 'idle' } : a
          ),
        })),

      addMessage: (msg) => {
        const message: AgentMessage = {
          ...msg,
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          timestamp: Date.now(),
        };
        set((s) => ({
          messages: [...s.messages.slice(-200), message],
        }));
      },

      clearMessages: () => set({ messages: [] }),

      setAnalyzing: (v) => set({ isAnalyzing: v }),

      setLastAnalysis: (result) =>
        set((s) => ({ lastAnalysis: result, analysisCount: s.analysisCount + 1 })),

      resetAgents: () =>
        set({
          agents: DEFAULT_AGENTS,
          messages: [],
          lastAnalysis: null,
          isAnalyzing: false,
          analysisCount: 0,
        }),
    }),
    {
      name: 'forex-agents-state',
      partialize: (s) => ({
        agents: s.agents.map((a) => ({ ...a, status: 'idle' as const })),
        analysisCount: s.analysisCount,
        lastAnalysis: s.lastAnalysis,
      }),
    }
  )
);
