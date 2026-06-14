'use client';

import { clsx } from 'clsx';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { useTradingStore } from '@/store/trading-store';
import Button from '@/components/ui/Button';
import type { Position, ClosedTrade } from '@/types';
import { useState } from 'react';

function PositionRow({ pos, onClose }: { pos: Position; onClose: (id: string) => void }) {
  const isBuy = pos.direction === 'BUY';
  const pnlPositive = pos.pnl >= 0;

  return (
    <tr className="border-b border-[#1C2230] hover:bg-[#1C2230]/50 transition-colors">
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1">
          {isBuy ? (
            <TrendingUp className="w-3 h-3 text-[#089981]" />
          ) : (
            <TrendingDown className="w-3 h-3 text-[#F23645]" />
          )}
          <span className={clsx('text-[11px] font-semibold', isBuy ? 'text-[#089981]' : 'text-[#F23645]')}>
            {pos.direction}
          </span>
        </div>
      </td>
      <td className="px-2 py-1.5 text-[11px] font-mono text-[#D1D4DC]">{pos.symbol}</td>
      <td className="px-2 py-1.5 text-[11px] font-mono text-[#D1D4DC]">{pos.size}</td>
      <td className="px-2 py-1.5 text-[11px] font-mono text-[#D1D4DC]">{pos.entryPrice.toFixed(5)}</td>
      <td className="px-2 py-1.5 text-[11px] font-mono text-[#D1D4DC]">{pos.currentPrice.toFixed(5)}</td>
      <td className="px-2 py-1.5">
        <span
          className={clsx(
            'text-[11px] font-mono font-semibold',
            pnlPositive ? 'text-[#089981]' : 'text-[#F23645]'
          )}
        >
          {pnlPositive ? '+' : ''}${pos.pnl.toFixed(2)}
        </span>
      </td>
      <td className="px-2 py-1.5">
        <span className="text-[10px] text-[#787B86]">
          {pos.stopLoss ? pos.stopLoss.toFixed(5) : '—'}
        </span>
      </td>
      <td className="px-2 py-1.5">
        <span className="text-[10px] text-[#787B86]">
          {pos.takeProfit ? pos.takeProfit.toFixed(5) : '—'}
        </span>
      </td>
      <td className="px-2 py-1.5">
        <button
          onClick={() => onClose(pos.id)}
          className="text-[#787B86] hover:text-[#F23645] transition-colors"
          title="Fermer la position"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

function HistoryRow({ trade }: { trade: ClosedTrade }) {
  const isBuy = trade.direction === 'BUY';
  const pnlPositive = trade.pnl >= 0;

  return (
    <tr className="border-b border-[#1C2230] hover:bg-[#1C2230]/50">
      <td className="px-2 py-1.5">
        <span className={clsx('text-[11px] font-semibold', isBuy ? 'text-[#089981]' : 'text-[#F23645]')}>
          {trade.direction}
        </span>
      </td>
      <td className="px-2 py-1.5 text-[11px] font-mono text-[#D1D4DC]">{trade.symbol}</td>
      <td className="px-2 py-1.5 text-[11px] font-mono text-[#D1D4DC]">{trade.size}</td>
      <td className="px-2 py-1.5 text-[11px] font-mono text-[#D1D4DC]">{trade.entryPrice.toFixed(5)}</td>
      <td className="px-2 py-1.5 text-[11px] font-mono text-[#D1D4DC]">{trade.exitPrice.toFixed(5)}</td>
      <td className="px-2 py-1.5">
        <span className={clsx('text-[11px] font-mono font-semibold', pnlPositive ? 'text-[#089981]' : 'text-[#F23645]')}>
          {pnlPositive ? '+' : ''}${trade.pnl.toFixed(2)}
        </span>
      </td>
      <td className="px-2 py-1.5 text-[10px] text-[#787B86]">
        {new Date(trade.closedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </td>
      <td className="px-2 py-1.5 text-[10px] text-[#787B86] max-w-[120px] truncate">
        {trade.reason ?? '—'}
      </td>
    </tr>
  );
}

export default function PositionsPanel() {
  const { positions, closedTrades, closePosition, quote } = useTradingStore();
  const [tab, setTab] = useState<'open' | 'history'>('open');

  const handleClose = (id: string) => {
    const price = quote?.price ?? 0;
    closePosition(id, price, 'Clôture manuelle');
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1017]">
      {/* Tabs */}
      <div className="flex border-b border-[#2A2E3D]">
        <button
          className={clsx(
            'px-4 py-1.5 text-[11px] font-medium border-b-2 transition-colors',
            tab === 'open'
              ? 'border-[#2962FF] text-[#D1D4DC]'
              : 'border-transparent text-[#787B86] hover:text-[#D1D4DC]'
          )}
          onClick={() => setTab('open')}
        >
          Positions Ouvertes ({positions.length})
        </button>
        <button
          className={clsx(
            'px-4 py-1.5 text-[11px] font-medium border-b-2 transition-colors',
            tab === 'history'
              ? 'border-[#2962FF] text-[#D1D4DC]'
              : 'border-transparent text-[#787B86] hover:text-[#D1D4DC]'
          )}
          onClick={() => setTab('history')}
        >
          Historique ({closedTrades.length})
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {tab === 'open' ? (
          <table className="w-full">
            <thead className="sticky top-0 bg-[#131722]">
              <tr>
                {['Dir.', 'Symbole', 'Taille', 'Entrée', 'Actuel', 'P&L', 'SL', 'TP', ''].map((h) => (
                  <th
                    key={h}
                    className="px-2 py-1.5 text-left text-[10px] font-medium text-[#787B86] uppercase tracking-wide border-b border-[#2A2E3D]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-[11px] text-[#787B86]">
                    Aucune position ouverte
                  </td>
                </tr>
              ) : (
                positions.map((pos) => (
                  <PositionRow key={pos.id} pos={pos} onClose={handleClose} />
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-[#131722]">
              <tr>
                {['Dir.', 'Symbole', 'Taille', 'Entrée', 'Sortie', 'P&L', 'Heure', 'Raison'].map((h) => (
                  <th
                    key={h}
                    className="px-2 py-1.5 text-left text-[10px] font-medium text-[#787B86] uppercase tracking-wide border-b border-[#2A2E3D]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {closedTrades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-[11px] text-[#787B86]">
                    Aucun trade dans l'historique
                  </td>
                </tr>
              ) : (
                closedTrades.slice(0, 50).map((trade) => (
                  <HistoryRow key={trade.id} trade={trade} />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
