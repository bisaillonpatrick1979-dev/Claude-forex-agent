'use client';

import { clsx } from 'clsx';
import {
  BarChart2,
  Newspaper,
  Shield,
  Globe2,
  Cpu,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import type { Agent } from '@/types';
import { useAgentsStore } from '@/store/agents-store';
import { Badge } from '@/components/ui/Card';

const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  technical_analyst: BarChart2,
  sentiment_analyst: Newspaper,
  risk_manager: Shield,
  macro_analyst: Globe2,
  coordinator: Cpu,
};

const AGENT_COLORS: Record<string, string> = {
  technical_analyst: '#2962FF',
  sentiment_analyst: '#F7A600',
  risk_manager: '#089981',
  macro_analyst: '#9C27B0',
  coordinator: '#F23645',
};

export default function AgentCard({ agent }: { agent: Agent }) {
  const { toggleAgent } = useAgentsStore();
  const Icon = AGENT_ICONS[agent.type] ?? Cpu;
  const color = AGENT_COLORS[agent.type] ?? '#787B86';

  const statusIcon = () => {
    if (!agent.enabled) return <XCircle className="w-3 h-3 text-[#787B86]" />;
    if (agent.status === 'analyzing') return <Loader2 className="w-3 h-3 animate-spin text-[#F7A600]" />;
    if (agent.status === 'active') return <div className="w-2 h-2 rounded-full bg-[#089981] agent-active" />;
    return <div className="w-2 h-2 rounded-full bg-[#2A2E3D]" />;
  };

  const signalBadge = () => {
    if (!agent.signal || !agent.enabled) return null;
    if (agent.signal === 'BUY') return (
      <Badge variant="green" className="flex items-center gap-0.5">
        <TrendingUp className="w-2.5 h-2.5" /> BUY
      </Badge>
    );
    if (agent.signal === 'SELL') return (
      <Badge variant="red" className="flex items-center gap-0.5">
        <TrendingDown className="w-2.5 h-2.5" /> SELL
      </Badge>
    );
    return (
      <Badge variant="default" className="flex items-center gap-0.5">
        <Minus className="w-2.5 h-2.5" /> HOLD
      </Badge>
    );
  };

  return (
    <div
      className={clsx(
        'rounded border transition-all duration-200 p-2.5',
        agent.enabled
          ? 'bg-[#131722] border-[#2A2E3D] hover:border-[#3d4460]'
          : 'bg-[#0d1017] border-[#1a1f2e] opacity-60'
      )}
      style={agent.status === 'analyzing' ? { borderColor: color, boxShadow: `0 0 6px ${color}30` } : {}}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {statusIcon()}
              <span className="text-[12px] font-medium text-[#D1D4DC] truncate">{agent.name}</span>
            </div>
            <p className="text-[10px] text-[#787B86] truncate mt-0.5">{agent.description}</p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => toggleAgent(agent.id)}
          className={clsx(
            'relative w-8 h-4 rounded-full transition-colors flex-shrink-0 mt-0.5',
            agent.enabled ? 'bg-[#2962FF]' : 'bg-[#2A2E3D]'
          )}
        >
          <div
            className={clsx(
              'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
              agent.enabled ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>

      {/* Signal + Confidence */}
      {agent.enabled && (agent.signal || agent.confidence !== undefined) && (
        <div className="mt-2 flex items-center justify-between">
          {signalBadge()}
          {agent.confidence !== undefined && (
            <div className="flex items-center gap-1.5 flex-1 ml-2">
              <div className="flex-1 h-1 bg-[#1C2230] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${agent.confidence}%`,
                    backgroundColor:
                      agent.confidence >= 70 ? '#089981' : agent.confidence >= 50 ? '#F7A600' : '#F23645',
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-[#787B86]">{agent.confidence}%</span>
            </div>
          )}
        </div>
      )}

      {/* Last analysis snippet */}
      {agent.enabled && agent.lastAnalysis && (
        <p className="mt-1.5 text-[10px] text-[#787B86] line-clamp-2 leading-relaxed">
          {agent.lastAnalysis}
        </p>
      )}
    </div>
  );
}
