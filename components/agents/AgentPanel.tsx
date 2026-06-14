'use client';

import { Play, RotateCcw, Zap } from 'lucide-react';
import { useAgentsStore } from '@/store/agents-store';
import AgentCard from './AgentCard';
import Button from '@/components/ui/Button';

interface AgentPanelProps {
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export default function AgentPanel({ onAnalyze, isAnalyzing }: AgentPanelProps) {
  const { agents, analysisCount, resetAgents } = useAgentsStore();
  const enabledCount = agents.filter((a) => a.enabled).length;
  const buySignals = agents.filter((a) => a.signal === 'BUY' && a.enabled).length;
  const sellSignals = agents.filter((a) => a.signal === 'SELL' && a.enabled).length;

  return (
    <div className="flex flex-col h-full bg-[#131722]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#2A2E3D]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#F7A600]" />
            <span className="text-[11px] font-semibold text-[#787B86] uppercase tracking-wider">
              Agents IA
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#787B86]">
              {enabledCount}/{agents.length} actifs
            </span>
          </div>
        </div>

        {/* Consensus bar */}
        {analysisCount > 0 && (buySignals > 0 || sellSignals > 0) && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-[#089981]">BUY {buySignals}</span>
              <span className="text-[#787B86]">Consensus</span>
              <span className="text-[#F23645]">SELL {sellSignals}</span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-[#1C2230]">
              <div
                className="bg-[#089981] transition-all"
                style={{ width: `${(buySignals / enabledCount) * 100}%` }}
              />
              <div
                className="bg-[#F23645] transition-all ml-auto"
                style={{ width: `${(sellSignals / enabledCount) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Analyze button */}
        <Button
          variant={isAnalyzing ? 'outline' : 'default'}
          size="sm"
          className="w-full"
          onClick={onAnalyze}
          loading={isAnalyzing}
          disabled={isAnalyzing || enabledCount === 0}
        >
          {isAnalyzing ? (
            'Analyse en cours...'
          ) : (
            <>
              <Play className="w-3 h-3" /> Lancer l'Analyse
            </>
          )}
        </Button>
      </div>

      {/* Agent cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-[#2A2E3D] flex items-center justify-between">
        <span className="text-[10px] text-[#787B86]">
          {analysisCount} analyse{analysisCount !== 1 ? 's' : ''}
        </span>
        <button
          onClick={resetAgents}
          className="flex items-center gap-1 text-[10px] text-[#787B86] hover:text-[#D1D4DC] transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Réinitialiser
        </button>
      </div>
    </div>
  );
}
