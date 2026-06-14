'use client';

import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import {
  BarChart2,
  Newspaper,
  Shield,
  Globe2,
  Cpu,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { useAgentsStore } from '@/store/agents-store';
import type { AgentMessage, AgentType } from '@/types';

const AGENT_ICONS: Record<AgentType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  technical_analyst: BarChart2,
  sentiment_analyst: Newspaper,
  risk_manager: Shield,
  macro_analyst: Globe2,
  coordinator: Cpu,
};

const AGENT_COLORS: Record<AgentType, string> = {
  technical_analyst: '#2962FF',
  sentiment_analyst: '#F7A600',
  risk_manager: '#089981',
  macro_analyst: '#9C27B0',
  coordinator: '#F23645',
};

const TYPE_LABELS: Record<AgentMessage['type'], string> = {
  analysis: 'ANALYSE',
  signal: 'SIGNAL',
  risk: 'RISQUE',
  decision: 'DÉCISION',
  info: 'INFO',
  debate: 'DÉBAT',
};

const TYPE_COLORS: Record<AgentMessage['type'], string> = {
  analysis: '#2962FF',
  signal: '#F7A600',
  risk: '#089981',
  decision: '#F23645',
  info: '#787B86',
  debate: '#9C27B0',
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function MessageBubble({ msg }: { msg: AgentMessage }) {
  const Icon = AGENT_ICONS[msg.agentType];
  const agentColor = AGENT_COLORS[msg.agentType];
  const typeColor = TYPE_COLORS[msg.type];
  const isDecision = msg.type === 'decision';

  return (
    <div
      className={clsx(
        'flex gap-2 p-2 rounded mb-1.5 animate-fade-in',
        isDecision
          ? 'bg-[#1C2230] border border-[#F23645]/30'
          : 'bg-[#131722] border border-[#1C2230]'
      )}
    >
      {/* Agent icon */}
      <div
        className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center mt-0.5"
        style={{ backgroundColor: `${agentColor}20`, border: `1px solid ${agentColor}40` }}
      >
        <Icon className="w-3 h-3" style={{ color: agentColor }} />
      </div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-semibold" style={{ color: agentColor }}>
            {msg.agentName}
          </span>
          <span
            className="text-[9px] px-1 py-0.5 rounded font-semibold uppercase"
            style={{ backgroundColor: `${typeColor}20`, color: typeColor }}
          >
            {TYPE_LABELS[msg.type]}
          </span>
          <span className="text-[10px] text-[#787B86] ml-auto font-mono">{formatTime(msg.timestamp)}</span>
        </div>

        {/* Content - supports bold markdown */}
        <div className="text-[11px] text-[#D1D4DC] leading-relaxed whitespace-pre-wrap break-words">
          {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={i} className="font-semibold text-white">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentChat() {
  const { messages, clearMessages, isAnalyzing } = useAgentsStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-[#0d1017]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A2E3D] bg-[#131722]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-[#2962FF]" />
          <span className="text-[11px] font-semibold text-[#787B86] uppercase tracking-wider">
            Discussion des Agents
          </span>
          {isAnalyzing && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#089981] live-dot" />
              <span className="text-[10px] text-[#089981]">EN DIRECT</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#787B86]">{messages.length} messages</span>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-[#787B86] hover:text-[#F23645] transition-colors"
              title="Effacer les messages"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-8 h-8 text-[#2A2E3D] mb-2" />
            <p className="text-[11px] text-[#787B86]">
              Les agents discuteront ici lors de l'analyse
            </p>
            <p className="text-[10px] text-[#3d4460] mt-1">
              Cliquez sur "Lancer l'Analyse" pour commencer
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isAnalyzing && (
              <div className="flex items-center gap-2 p-2">
                <div className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#2962FF] animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-[#787B86]">Agent en cours d'analyse...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
}
