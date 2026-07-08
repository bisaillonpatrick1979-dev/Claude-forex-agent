'use client';

// Carte affichant une cotation de marché
import type { Cotation } from '@/types';

interface Props {
  cotation: Cotation;
}

export default function CarteCotation({ cotation }: Props) {
  const hausse = cotation.variationPct >= 0;

  const formaterPrix = (prix: number): string => {
    if (prix > 10000) return prix.toLocaleString('fr-CA', { maximumFractionDigits: 0 });
    if (prix > 100) return prix.toFixed(2);
    return prix.toFixed(4);
  };

  return (
    <div
      className="carte"
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cotation.nom}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{cotation.symbole}</div>
        </div>
        <span
          style={{
            fontSize: '0.65rem',
            padding: '2px 6px',
            borderRadius: 4,
            background: cotation.marche === 'forex' ? '#1e3a5f' : cotation.marche === 'crypto' ? '#3b1f5e' : '#1a3d2b',
            color: cotation.marche === 'forex' ? '#60a5fa' : cotation.marche === 'crypto' ? '#a78bfa' : '#4ade80',
          }}
        >
          {cotation.marche}
        </span>
      </div>

      <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>
        {formaterPrix(cotation.prix)}
      </div>

      <div style={{ fontSize: '0.8rem', color: hausse ? 'var(--haussier)' : 'var(--baissier)' }}>
        {hausse ? '+' : ''}{cotation.variationPct.toFixed(2)}%
        <span style={{ marginLeft: 6, fontSize: '0.75rem' }}>
          ({hausse ? '+' : ''}{cotation.variation.toFixed(4)})
        </span>
      </div>
    </div>
  );
}
