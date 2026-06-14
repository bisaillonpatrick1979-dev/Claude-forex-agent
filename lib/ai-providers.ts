import type { AIProvider } from '@/types';

// Dynamic AI provider model selection
export function getModelId(provider: AIProvider, customModel?: string): string {
  if (customModel) return customModel;
  const defaults: Record<AIProvider, string> = {
    anthropic: 'claude-sonnet-4-6',
    openai: 'gpt-4o',
    google: 'gemini-1.5-pro',
  };
  return defaults[provider];
}

export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  anthropic: [
    'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001',
    'claude-opus-4-8',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
  ],
  google: [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-pro',
  ],
};

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  anthropic: 'Anthropic Claude',
  openai: 'OpenAI GPT',
  google: 'Google Gemini',
};
