'use client';

// Tableau des positions ouvertes
import type { Position, Cotation } from '@/types';
import { calculerPnL } from '@/lib/supabase/services/positions';

interface Props {
  positions: Position[];
  cotations: Cotation[];
}

export default function TablePositions({ positions, cotations }: Props) {
  const prixActuels = Object.fromEntries(cotations.map((c) => [c.symbole, c.prix]));

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
            {['Symbole', 'Direction', 'Taille', 'Entrée', 'SL', 'TP', 'P&L', 'Statut'].map((h) => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => {
            const prixActuel = prixActuels[pos.symbole];
            const pnl = prixActuel ? calculerPnL(pos, prixActuel) : undefined;
            return (
              <tr key={pos.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{pos.symbole}</td>
                <td style={{ padding: '8px 12px', color: pos.direction === 'achat' ? 'var(--haussier)' : 'var(--baissier)' }}>
                  {pos.direction.toUpperCase()}
                </td>
                <td style={{ padding: '8px 12px' }}>{pos.taille}</td>
                <td style={{ padding: '8px 12px' }}>{pos.prixEntree.toFixed(4)}</td>
                <td style={{ padding: '8px 12px', color: 'var(--baissier)' }}>
                  {pos.stopLoss?.toFixed(4) ?? '—'}
                </td>
                <td style={{ padding: '8px 12px', color: 'var(--haussier)' }}>
                  {pos.takeProfit?.toFixed(4) ?? '—'}
                </td>
                <td style={{ padding: '8px 12px', color: pnl !== undefined ? (pnl >= 0 ? 'var(--haussier)' : 'var(--baissier)') : 'var(--text-muted)' }}>
                  {pnl !== undefined ? `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {pos.statut}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
