'use client';

import { useState } from 'react';
import { useTradingStore } from '@/store/trading-store';
import Button from '@/components/ui/Button';
import type { Timeframe } from '@/types';

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: 'M1', value: '1min' },
  { label: 'M5', value: '5min' },
  { label: 'M15', value: '15min' },
  { label: 'M30', value: '30min' },
  { label: 'H1', value: '60min' },
  { label: 'D1', value: 'daily' },
  { label: 'W1', value: 'weekly' },
  { label: 'MN', value: 'monthly' },
];

interface ChartControlsProps {
  onTimeframeChange: (tf: Timeframe) => void;
  onIndicatorToggle: (indicator: string, enabled: boolean) => void;
  indicators: {
    rsi: boolean;
    macd: boolean;
    bollinger: boolean;
    ema: boolean;
    fibonacci: boolean;
  };
}

export default function ChartControls({
  onTimeframeChange,
  onIndicatorToggle,
  indicators,
}: ChartControlsProps) {
  const { activeTimeframe } = useTradingStore();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#131722] border-b border-[#2A2E3D]">
      {/* Timeframes */}
      <div className="flex items-center gap-0.5">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.value}
            onClick={() => onTimeframeChange(tf.value)}
            className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
              activeTimeframe === tf.value
                ? 'bg-[#2962FF] text-white'
                : 'text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#1C2230]'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-[#2A2E3D]" />

      {/* Indicators */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-[#787B86] mr-1">Indicateurs:</span>
        {[
          { key: 'bollinger', label: 'BB', color: '#2962FF' },
          { key: 'ema', label: 'EMA', color: '#F7A600' },
          { key: 'fibonacci', label: 'Fib', color: '#9C27B0' },
          { key: 'rsi', label: 'RSI', color: '#2962FF' },
          { key: 'macd', label: 'MACD', color: '#F7A600' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => onIndicatorToggle(key, !indicators[key as keyof typeof indicators])}
            className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-all ${
              indicators[key as keyof typeof indicators]
                ? 'border-transparent text-white'
                : 'border-[#2A2E3D] text-[#787B86]'
            }`}
            style={
              indicators[key as keyof typeof indicators]
                ? { backgroundColor: `${color}33`, borderColor: color, color }
                : {}
            }
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
