'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTradingStore } from '@/store/trading-store';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function OrderForm() {
  const { quote, openPosition, activePair, balance } = useTradingStore();
  const [size, setSize] = useState('0.01');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');

  const currentPrice = quote?.price ?? 0;
  const lotSize = parseFloat(size) || 0.01;
  const pipValue = lotSize * 10; // approx $10 per pip per standard lot

  const handleTrade = (direction: 'BUY' | 'SELL') => {
    if (!currentPrice) {
      toast.error('Pas de prix disponible');
      return;
    }
    if (lotSize <= 0 || lotSize > 100) {
      toast.error('Taille de lot invalide (0.01 - 100)');
      return;
    }

    const pos = openPosition({
      symbol: activePair,
      direction,
      entryPrice: direction === 'BUY' ? (quote?.ask ?? currentPrice) : (quote?.bid ?? currentPrice),
      size: lotSize,
      stopLoss: sl ? parseFloat(sl) : undefined,
      takeProfit: tp ? parseFloat(tp) : undefined,
      openedAt: Date.now(),
      agentId: 'manual',
    });

    toast.success(
      `${direction === 'BUY' ? '🟢' : '🔴'} ${direction} ${lotSize} lots ${activePair} @ ${pos.entryPrice.toFixed(5)}`
    );
  };

  return (
    <div className="p-2 space-y-2">
      {/* Price display */}
      <div className="grid grid-cols-2 gap-1">
        <div className="bg-[#F23645]/10 border border-[#F23645]/20 rounded p-2 text-center">
          <div className="text-[10px] text-[#787B86] mb-0.5">VENTE (BID)</div>
          <div className="text-[15px] font-mono font-bold text-[#F23645]">
            {quote?.bid.toFixed(5) ?? '—.—'}
          </div>
        </div>
        <div className="bg-[#089981]/10 border border-[#089981]/20 rounded p-2 text-center">
          <div className="text-[10px] text-[#787B86] mb-0.5">ACHAT (ASK)</div>
          <div className="text-[15px] font-mono font-bold text-[#089981]">
            {quote?.ask.toFixed(5) ?? '—.—'}
          </div>
        </div>
      </div>

      {/* Lot size */}
      <div>
        <label className="text-[10px] text-[#787B86] block mb-1">Taille (lots)</label>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSize((prev) => Math.max(0.01, parseFloat(prev) - 0.01).toFixed(2))}
            className="px-2 py-1 bg-[#1C2230] border border-[#2A2E3D] rounded text-[#D1D4DC] text-sm hover:bg-[#2A2E3D]"
          >
            −
          </button>
          <input
            type="number"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            step="0.01"
            min="0.01"
            max="100"
            className="flex-1 bg-[#1C2230] border border-[#2A2E3D] rounded px-2 py-1 text-[12px] font-mono text-[#D1D4DC] text-center focus:outline-none focus:border-[#2962FF]"
          />
          <button
            onClick={() => setSize((prev) => Math.min(100, parseFloat(prev) + 0.01).toFixed(2))}
            className="px-2 py-1 bg-[#1C2230] border border-[#2A2E3D] rounded text-[#D1D4DC] text-sm hover:bg-[#2A2E3D]"
          >
            +
          </button>
        </div>
        <div className="text-[10px] text-[#787B86] mt-0.5">
          ≈ ${(lotSize * 1000).toFixed(0)} notionnel | ${pipValue.toFixed(2)}/pip
        </div>
      </div>

      {/* SL / TP */}
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <label className="text-[10px] text-[#F23645] block mb-1">Stop Loss</label>
          <input
            type="number"
            value={sl}
            onChange={(e) => setSl(e.target.value)}
            placeholder="Prix SL"
            step="0.00001"
            className="w-full bg-[#1C2230] border border-[#F23645]/30 rounded px-2 py-1 text-[11px] font-mono text-[#D1D4DC] focus:outline-none focus:border-[#F23645]/70"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#089981] block mb-1">Take Profit</label>
          <input
            type="number"
            value={tp}
            onChange={(e) => setTp(e.target.value)}
            placeholder="Prix TP"
            step="0.00001"
            className="w-full bg-[#1C2230] border border-[#089981]/30 rounded px-2 py-1 text-[11px] font-mono text-[#D1D4DC] focus:outline-none focus:border-[#089981]/70"
          />
        </div>
      </div>

      {/* Trade buttons */}
      <div className="grid grid-cols-2 gap-1.5">
        <Button
          variant="sell"
          size="md"
          className="w-full"
          onClick={() => handleTrade('SELL')}
          disabled={!quote}
        >
          <TrendingDown className="w-3.5 h-3.5" /> VENDRE
        </Button>
        <Button
          variant="buy"
          size="md"
          className="w-full"
          onClick={() => handleTrade('BUY')}
          disabled={!quote}
        >
          <TrendingUp className="w-3.5 h-3.5" /> ACHETER
        </Button>
      </div>

      <div className="text-[10px] text-[#787B86] text-center">
        Paper Trading — Aucune transaction réelle
      </div>
    </div>
  );
}
