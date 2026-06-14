'use client';

import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle, Trophy } from 'lucide-react';
import { useTradingStore } from '@/store/trading-store';
import { clsx } from 'clsx';

function StatItem({
  label,
  value,
  positive,
  icon: Icon,
}: {
  label: string;
  value: string;
  positive?: boolean | null;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-[#1C2230] rounded px-2.5 py-2">
      <div className="flex items-center gap-1 mb-1">
        {Icon && <Icon className="w-3 h-3 text-[#787B86]" />}
        <span className="text-[10px] text-[#787B86] uppercase tracking-wide">{label}</span>
      </div>
      <span
        className={clsx('text-[13px] font-mono font-semibold', {
          'text-[#089981]': positive === true,
          'text-[#F23645]': positive === false,
          'text-[#D1D4DC]': positive === null || positive === undefined,
        })}
      >
        {value}
      </span>
    </div>
  );
}

export default function PortfolioStats() {
  const { stats, initialCapital, positions } = useTradingStore();

  const totalReturn = ((stats.equity - initialCapital) / initialCapital) * 100;
  const openPnl = positions.reduce((s, p) => s + p.pnl, 0);

  return (
    <div className="p-2 grid grid-cols-3 gap-1.5">
      <StatItem
        label="Capital"
        value={`$${stats.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={DollarSign}
      />
      <StatItem
        label="Équité"
        value={`$${stats.equity.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        positive={stats.equity >= initialCapital ? true : false}
        icon={TrendingUp}
      />
      <StatItem
        label="Rendement"
        value={`${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`}
        positive={totalReturn >= 0 ? true : false}
        icon={Trophy}
      />
      <StatItem
        label="P&L Non-Réalisé"
        value={`${openPnl >= 0 ? '+' : ''}$${openPnl.toFixed(2)}`}
        positive={openPnl >= 0 ? null : false}
        icon={Target}
      />
      <StatItem
        label="Taux Succès"
        value={`${stats.winRate.toFixed(1)}%`}
        positive={stats.winRate >= 50 ? true : stats.winRate < 40 ? false : null}
        icon={TrendingDown}
      />
      <StatItem
        label="Drawdown Max"
        value={`${stats.maxDrawdown.toFixed(2)}%`}
        positive={stats.maxDrawdown < 10 ? true : stats.maxDrawdown > 20 ? false : null}
        icon={AlertTriangle}
      />
    </div>
  );
}
