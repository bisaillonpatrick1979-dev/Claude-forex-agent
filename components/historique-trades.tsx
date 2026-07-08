'use client';

// Tableau d'historique des positions fermées
import type { Position } from '@/types';

interface Props {
  positions: Position[];
}

export default function HistoriqueTrades({ positions }: Props) {
  const pnlTotal = positions.reduce((s, p) => s + (p.pnl ?? 0), 0);
  const gagnants = positions.filter((p) => (p.pnl ?? 0) > 0).length;

  if (positions.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80, color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>📋</div>
        <div style={{ fontWeight: 600 }}>Aucun trade fermé pour le moment</div>
        <div style={{ marginTop: 8, fontSize: '0.875rem' }}>
          Les positions fermées apparaîtront ici.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Historique des trades</h1>

      {/* Statistiques sommaires */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total trades', valeur: positions.length, couleur: 'var(--text)' },
          { label: 'Gagnants', valeur: gagnants, couleur: 'var(--haussier)' },
          { label: 'Perdants', valeur: positions.length - gagnants, couleur: 'var(--baissier)' },
          {
            label: 'Taux de réussite',
            valeur: `${((gagnants / positions.length) * 100).toFixed(1)}%`,
            couleur: gagnants / positions.length >= 0.5 ? 'var(--haussier)' : 'var(--baissier)',
          },
          {
            label: 'P&L total',
            valeur: `${pnlTotal >= 0 ? '+' : ''}${pnlTotal.toFixed(2)}`,
            couleur: pnlTotal >= 0 ? 'var(--haussier)' : 'var(--baissier)',
          },
        ].map(({ label, valeur, couleur }) => (
          <div key={label} className="carte">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: couleur }}>{valeur}</div>
          </div>
        ))}
      </div>

      {/* Tableau des trades */}
      <div className="carte" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-panel)', color: 'var(--text-muted)' }}>
                {['Date ouv.', 'Date ferm.', 'Symbole', 'Direction', 'Taille', 'Entrée', 'Sortie', 'SL', 'TP', 'P&L', 'Raisonnement'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const pnl = pos.pnl ?? 0;
                return (
                  <tr
                    key={pos.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-panel)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '8px 14px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {new Date(pos.ouvert_le).toLocaleDateString('fr-CA')}
                    </td>
                    <td style={{ padding: '8px 14px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {pos.ferme_le ? new Date(pos.ferme_le).toLocaleDateString('fr-CA') : '—'}
                    </td>
                    <td style={{ padding: '8px 14px', fontWeight: 600 }}>{pos.symbole}</td>
                    <td style={{ padding: '8px 14px', color: pos.direction === 'achat' ? 'var(--haussier)' : 'var(--baissier)' }}>
                      {pos.direction.toUpperCase()}
                    </td>
                    <td style={{ padding: '8px 14px' }}>{pos.taille}</td>
                    <td style={{ padding: '8px 14px' }}>{pos.prixEntree.toFixed(4)}</td>
                    <td style={{ padding: '8px 14px' }}>{pos.prixSortie?.toFixed(4) ?? '—'}</td>
                    <td style={{ padding: '8px 14px', color: 'var(--baissier)' }}>{pos.stopLoss?.toFixed(4) ?? '—'}</td>
                    <td style={{ padding: '8px 14px', color: 'var(--haussier)' }}>{pos.takeProfit?.toFixed(4) ?? '—'}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 600, color: pnl >= 0 ? 'var(--haussier)' : 'var(--baissier)' }}>
                      {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pos.raisonnement ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
