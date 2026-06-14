'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Key,
  Bot,
  DollarSign,
  Settings2,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useSettingsStore } from '@/store/settings-store';
import { useTradingStore } from '@/store/trading-store';
import { useAgentsStore } from '@/store/agents-store';
import Button from '@/components/ui/Button';
import { PROVIDER_MODELS, PROVIDER_LABELS } from '@/lib/ai-providers';
import type { AIProvider, Timeframe } from '@/types';
import toast from 'react-hot-toast';

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#131722] border border-[#2A2E3D] rounded p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#2962FF]" />
        <h2 className="text-[13px] font-semibold text-[#D1D4DC]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ApiKeyInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-[11px] text-[#787B86] block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? `Votre clé ${label}`}
          className="flex-1 bg-[#1C2230] border border-[#2A2E3D] rounded px-3 py-1.5 text-[12px] font-mono text-[#D1D4DC] focus:outline-none focus:border-[#2962FF] placeholder:text-[#3d4460]"
        />
        <button
          onClick={() => setShow(!show)}
          className="p-1.5 text-[#787B86] hover:text-[#D1D4DC] transition-colors"
        >
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        {value && (
          <CheckCircle2 className="w-4 h-4 text-[#089981]" />
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const settings = useSettingsStore();
  const tradingStore = useTradingStore();
  const { resetAgents } = useAgentsStore();

  const [localCapital, setLocalCapital] = useState(String(settings.initialCapital));
  const [localRisk, setLocalRisk] = useState(String(settings.riskPerTrade));
  const [localInterval, setLocalInterval] = useState(String(settings.analysisInterval));

  const handleSave = () => {
    const capital = parseFloat(localCapital);
    const risk = parseFloat(localRisk);
    const interval = parseInt(localInterval, 10);

    if (capital >= 100 && capital <= 10_000_000) {
      settings.setInitialCapital(capital);
    }
    if (risk >= 0.1 && risk <= 10) {
      settings.setRiskPerTrade(risk);
    }
    if (interval >= 30 && interval <= 3600) {
      settings.setAnalysisInterval(interval);
    }
    toast.success('Paramètres sauvegardés!');
  };

  const handleResetPortfolio = () => {
    const capital = parseFloat(localCapital) || settings.initialCapital;
    tradingStore.resetPortfolio(capital);
    resetAgents();
    toast.success(`Portfolio réinitialisé à $${capital.toLocaleString()}`);
  };

  const providers: { value: AIProvider; label: string; color: string }[] = [
    { value: 'anthropic', label: 'Anthropic Claude', color: '#FF6B35' },
    { value: 'openai', label: 'OpenAI GPT', color: '#74AA9C' },
    { value: 'google', label: 'Google Gemini', color: '#4285F4' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#D1D4DC] p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <button className="flex items-center gap-2 text-[#787B86] hover:text-[#D1D4DC] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-[12px]">Retour au Dashboard</span>
            </button>
          </Link>
          <h1 className="text-[16px] font-bold text-white ml-2">⚙️ Paramètres</h1>
        </div>

        {/* API Keys */}
        <Section icon={Key} title="Clés API">
          <div className="bg-[#F7A600]/10 border border-[#F7A600]/20 rounded p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#F7A600] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#F7A600]">
              Les clés API sont stockées localement dans votre navigateur et ne sont jamais partagées.
              Pour Vercel, configurez-les dans les variables d'environnement.
            </p>
          </div>

          <ApiKeyInput
            label="Alpha Vantage (Données marché)"
            value={settings.apiKeys.alphavantage}
            onChange={(v) => settings.setApiKey('alphavantage', v)}
            placeholder="Votre clé Alpha Vantage (gratuite sur alphavantage.co)"
          />
          <ApiKeyInput
            label="Anthropic Claude"
            value={settings.apiKeys.anthropic}
            onChange={(v) => settings.setApiKey('anthropic', v)}
            placeholder="sk-ant-..."
          />
          <ApiKeyInput
            label="OpenAI GPT"
            value={settings.apiKeys.openai}
            onChange={(v) => settings.setApiKey('openai', v)}
            placeholder="sk-..."
          />
          <ApiKeyInput
            label="Google Gemini"
            value={settings.apiKeys.google}
            onChange={(v) => settings.setApiKey('google', v)}
            placeholder="AIza..."
          />
        </Section>

        {/* AI Provider */}
        <Section icon={Bot} title="Fournisseur IA">
          <div>
            <label className="text-[11px] text-[#787B86] block mb-2">
              Choisissez votre fournisseur d'IA
            </label>
            <div className="grid grid-cols-3 gap-2">
              {providers.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => settings.setAIProvider(value)}
                  className={`p-3 rounded border text-center transition-all ${
                    settings.aiProvider === value
                      ? 'border-[#2962FF] bg-[#2962FF]/10'
                      : 'border-[#2A2E3D] hover:border-[#3d4460]'
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full mx-auto mb-1"
                    style={{ backgroundColor: color }}
                  />
                  <div className="text-[11px] font-medium">{label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-[#787B86] block mb-1">Modèle</label>
            <select
              value={settings.aiModel}
              onChange={(e) => settings.setAIModel(e.target.value)}
              className="w-full bg-[#1C2230] border border-[#2A2E3D] rounded px-3 py-1.5 text-[12px] text-[#D1D4DC] focus:outline-none focus:border-[#2962FF]"
            >
              {PROVIDER_MODELS[settings.aiProvider].map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        </Section>

        {/* Trading Settings */}
        <Section icon={DollarSign} title="Paper Trading">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-[#787B86] block mb-1">Capital Initial ($)</label>
              <input
                type="number"
                value={localCapital}
                onChange={(e) => setLocalCapital(e.target.value)}
                min={100}
                max={10000000}
                step={100}
                className="w-full bg-[#1C2230] border border-[#2A2E3D] rounded px-3 py-1.5 text-[12px] font-mono text-[#D1D4DC] focus:outline-none focus:border-[#2962FF]"
              />
              <p className="text-[10px] text-[#787B86] mt-0.5">Min: $100 | Max: $10,000,000</p>
            </div>
            <div>
              <label className="text-[11px] text-[#787B86] block mb-1">Risque par Trade (%)</label>
              <input
                type="number"
                value={localRisk}
                onChange={(e) => setLocalRisk(e.target.value)}
                min={0.1}
                max={10}
                step={0.1}
                className="w-full bg-[#1C2230] border border-[#2A2E3D] rounded px-3 py-1.5 text-[12px] font-mono text-[#D1D4DC] focus:outline-none focus:border-[#2962FF]"
              />
              <p className="text-[10px] text-[#787B86] mt-0.5">Recommandé: 1-2%</p>
            </div>
          </div>

          {/* Capital presets */}
          <div>
            <label className="text-[11px] text-[#787B86] block mb-1">Préréglages Rapides</label>
            <div className="flex gap-2 flex-wrap">
              {[1000, 5000, 10000, 50000, 100000, 1000000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setLocalCapital(String(amount))}
                  className={`px-2.5 py-1 text-[11px] rounded border transition-colors ${
                    localCapital === String(amount)
                      ? 'border-[#2962FF] text-[#2962FF] bg-[#2962FF]/10'
                      : 'border-[#2A2E3D] text-[#787B86] hover:border-[#3d4460] hover:text-[#D1D4DC]'
                  }`}
                >
                  ${amount >= 1000 ? `${amount / 1000}K` : amount}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-[#787B86] block mb-1">
              Trading Automatique
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => settings.setAutoTrade(!settings.autoTrade)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  settings.autoTrade ? 'bg-[#2962FF]' : 'bg-[#2A2E3D]'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.autoTrade ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <span className="text-[12px] text-[#D1D4DC]">
                {settings.autoTrade ? 'Activé — Les agents traderont automatiquement' : 'Désactivé — Manuel seulement'}
              </span>
            </div>
          </div>

          {settings.autoTrade && (
            <div>
              <label className="text-[11px] text-[#787B86] block mb-1">
                Intervalle d'analyse automatique (secondes)
              </label>
              <input
                type="number"
                value={localInterval}
                onChange={(e) => setLocalInterval(e.target.value)}
                min={30}
                max={3600}
                step={30}
                className="w-full bg-[#1C2230] border border-[#2A2E3D] rounded px-3 py-1.5 text-[12px] font-mono text-[#D1D4DC] focus:outline-none focus:border-[#2962FF]"
              />
            </div>
          )}
        </Section>

        {/* Chart preferences */}
        <Section icon={Settings2} title="Préférences Graphique">
          <div>
            <label className="text-[11px] text-[#787B86] block mb-1">Paire par défaut</label>
            <select
              value={settings.defaultSymbol}
              onChange={(e) => settings.setDefaultSymbol(e.target.value)}
              className="w-full bg-[#1C2230] border border-[#2A2E3D] rounded px-3 py-1.5 text-[12px] font-mono text-[#D1D4DC] focus:outline-none focus:border-[#2962FF]"
            >
              {['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-[#787B86] block mb-1">Unité de temps par défaut</label>
            <select
              value={settings.defaultTimeframe}
              onChange={(e) => settings.setDefaultTimeframe(e.target.value as Timeframe)}
              className="w-full bg-[#1C2230] border border-[#2A2E3D] rounded px-3 py-1.5 text-[12px] text-[#D1D4DC] focus:outline-none focus:border-[#2962FF]"
            >
              {[
                { value: '1min', label: 'M1 — 1 minute' },
                { value: '5min', label: 'M5 — 5 minutes' },
                { value: '15min', label: 'M15 — 15 minutes' },
                { value: '30min', label: 'M30 — 30 minutes' },
                { value: '60min', label: 'H1 — 1 heure' },
                { value: 'daily', label: 'D1 — Journalier' },
                { value: 'weekly', label: 'W1 — Hebdomadaire' },
              ].map((tf) => (
                <option key={tf.value} value={tf.value}>{tf.label}</option>
              ))}
            </select>
          </div>
        </Section>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="danger"
            size="md"
            onClick={handleResetPortfolio}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser le Portfolio
          </Button>
          <Button
            variant="default"
            size="md"
            onClick={handleSave}
          >
            <Save className="w-3.5 h-3.5" />
            Sauvegarder les Paramètres
          </Button>
        </div>

        <div className="text-center text-[10px] text-[#3d4460] pb-4">
          ForexAgent Pro — Paper Trading Uniquement — Aucune transaction financière réelle
        </div>
      </div>
    </div>
  );
}
