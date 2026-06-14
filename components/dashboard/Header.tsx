'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Settings,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  DollarSign,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTradingStore } from '@/store/trading-store';
import { useSettingsStore } from '@/store/settings-store';
import type { ForexPair } from '@/types';

const FOREX_PAIRS: ForexPair[] = [
  { symbol: 'EUR/USD', from: 'EUR', to: 'USD', displayName: 'EUR/USD', pip: 0.0001, category: 'major' },
  { symbol: 'GBP/USD', from: 'GBP', to: 'USD', displayName: 'GBP/USD', pip: 0.0001, category: 'major' },
  { symbol: 'USD/JPY', from: 'USD', to: 'JPY', displayName: 'USD/JPY', pip: 0.01, category: 'major' },
  { symbol: 'USD/CHF', from: 'USD', to: 'CHF', displayName: 'USD/CHF', pip: 0.0001, category: 'major' },
  { symbol: 'AUD/USD', from: 'AUD', to: 'USD', displayName: 'AUD/USD', pip: 0.0001, category: 'major' },
  { symbol: 'USD/CAD', from: 'USD', to: 'CAD', displayName: 'USD/CAD', pip: 0.0001, category: 'major' },
  { symbol: 'NZD/USD', from: 'NZD', to: 'USD', displayName: 'NZD/USD', pip: 0.0001, category: 'major' },
  { symbol: 'EUR/GBP', from: 'EUR', to: 'GBP', displayName: 'EUR/GBP', pip: 0.0001, category: 'minor' },
  { symbol: 'EUR/JPY', from: 'EUR', to: 'JPY', displayName: 'EUR/JPY', pip: 0.01, category: 'minor' },
  { symbol: 'GBP/JPY', from: 'GBP', to: 'JPY', displayName: 'GBP/JPY', pip: 0.01, category: 'minor' },
];

interface HeaderProps {
  onPairChange: (pair: string) => void;
  onRefresh: () => void;
  isConnected: boolean;
  isLoading: boolean;
}

export default function Header({ onPairChange, onRefresh, isConnected, isLoading }: HeaderProps) {
  const { activePair, quote, stats } = useTradingStore();
  const { aiProvider, aiModel } = useSettingsStore();
  const [showPairs, setShowPairs] = useState(false);

  const priceChange = quote?.change ?? 0;
  const changePct = quote?.changePct ?? 0;
  const isPositive = priceChange >= 0;

  return (
    <header className="flex items-center gap-3 px-3 py-2 bg-[#131722] border-b border-[#2A2E3D] z-50">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded bg-[#2962FF] flex items-center justify-center">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-white leading-none">ForexAgent</div>
          <div className="text-[9px] text-[#787B86] leading-none mt-0.5">PRO</div>
        </div>
      </div>

      <div className="w-px h-6 bg-[#2A2E3D] flex-shrink-0" />

      {/* Pair selector */}
      <div className="relative">
        <button
          onClick={() => setShowPairs(!showPairs)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#1C2230] border border-[#2A2E3D] rounded hover:border-[#3d4460] transition-colors"
        >
          <span className="text-[13px] font-semibold text-white font-mono">{activePair}</span>
          <svg className="w-3 h-3 text-[#787B86]" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {showPairs && (
          <div className="absolute top-full left-0 mt-1 w-40 bg-[#1C2230] border border-[#2A2E3D] rounded shadow-xl z-50 overflow-hidden">
            {['major', 'minor'].map((cat) => (
              <div key={cat}>
                <div className="px-2 py-1 text-[9px] text-[#787B86] uppercase tracking-wider bg-[#131722]">
                  {cat === 'major' ? 'Majeures' : 'Mineures'}
                </div>
                {FOREX_PAIRS.filter((p) => p.category === cat).map((pair) => (
                  <button
                    key={pair.symbol}
                    onClick={() => {
                      onPairChange(pair.symbol);
                      setShowPairs(false);
                    }}
                    className={clsx(
                      'w-full text-left px-3 py-1.5 text-[12px] font-mono transition-colors hover:bg-[#2A2E3D]',
                      activePair === pair.symbol ? 'text-[#2962FF]' : 'text-[#D1D4DC]'
                    )}
                  >
                    {pair.symbol}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Price */}
      {quote && (
        <div className="flex items-center gap-3">
          <span className="text-[18px] font-mono font-bold text-white">
            {quote.price.toFixed(5)}
          </span>
          <div className={clsx('flex items-center gap-1', isPositive ? 'text-[#089981]' : 'text-[#F23645]')}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span className="text-[12px] font-mono font-medium">
              {isPositive ? '+' : ''}{priceChange.toFixed(5)} ({changePct.toFixed(2)}%)
            </span>
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Portfolio balance */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1C2230] rounded border border-[#2A2E3D]">
        <DollarSign className="w-3 h-3 text-[#089981]" />
        <span className="text-[12px] font-mono text-[#D1D4DC]">
          ${stats.equity.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        {stats.equity > stats.balance && (
          <span className="text-[10px] text-[#089981]">+${(stats.equity - stats.balance).toFixed(2)}</span>
        )}
      </div>

      {/* AI Provider badge */}
      <div className="px-2 py-1 bg-[#2962FF]/10 border border-[#2962FF]/30 rounded">
        <span className="text-[10px] text-[#2962FF] font-semibold uppercase">
          {aiProvider} · {aiModel.split('-')[1] ?? aiModel}
        </span>
      </div>

      {/* Connection status */}
      <div className="flex items-center gap-1">
        {isConnected ? (
          <div className="flex items-center gap-1 text-[#089981]">
            <Wifi className="w-3.5 h-3.5" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#089981] live-dot" />
          </div>
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-[#787B86]" />
        )}
      </div>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="text-[#787B86] hover:text-[#D1D4DC] transition-colors disabled:opacity-50"
        title="Rafraîchir les données"
      >
        <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
      </button>

      {/* Settings */}
      <Link href="/settings">
        <button className="text-[#787B86] hover:text-[#D1D4DC] transition-colors" title="Paramètres">
          <Settings className="w-4 h-4" />
        </button>
      </Link>
    </header>
  );
}
