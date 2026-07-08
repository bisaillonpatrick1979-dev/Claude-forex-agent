'use client';

// Page marchés — vue des cotations et indicateurs
import type { Cotation } from '@/types';
import CarteCotation from './carte-cotation';

interface DonneesSymbole {
  historique: unknown[];
  indicateurs: {
    rsi14?: number;
    mm20?: number;
    mm50?: number;
    tendance?: string;
    forceSignal?: number;
  };
}

interface Props {
  cotations: Cotation[];
  donneesParSymbole: Record<string, DonneesSymbole>;
}

function BadgeTendance({ tendance }: { tendance?: string }) {
  const style = {
    haussiere: { bg: '#14532d', color: '#86efac' },
    baissiere: { bg: '#7f1d1d', color: '#fca5a5' },
    laterale: { bg: '#713f12', color: '#fde68a' },
    neutre: { bg: '#1e293b', color: '#94a3b8' },
  }[tendance ?? 'neutre'] ?? { bg: '#1e293b', color: '#94a3b8' };

  return (
    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, background: style.bg, color: style.color }}>
      {tendance ?? 'neutre'}
    </span>
  );
}

export default function PageMarches({ cotations, donneesParSymbole }: Props) {
  const groupes = {
    Forex: cotations.filter((c) => c.marche === 'forex'),
    Actions: cotations.filter((c) => c.marche === 'actions'),
    Crypto: cotations.filter((c) => c.marche === 'crypto'),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 1400 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Marchés</h1>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Données Yahoo Finance — délai ~15 min (simulation uniquement)
      </div>

      {Object.entries(groupes).map(([nom, items]) => (
        <section key={nom}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>{nom}</h2>

          {/* Cartes cotations */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {items.map((c) => <CarteCotation key={c.symbole} cotation={c} />)}
          </div>

          {/* Tableau des indicateurs */}
          {items.some((c) => donneesParSymbole[c.symbole]) && (
            <div className="carte" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-panel)', color: 'var(--text-muted)' }}>
                      {['Symbole', 'RSI(14)', 'MM20', 'MM50', 'Tendance', 'Force signal'].map((h) => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c) => {
                      const d = donneesParSymbole[c.symbole];
                      if (!d) return null;
                      const ind = d.indicateurs;
                      const rsi = ind.rsi14;
                      return (
                        <tr key={c.symbole} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 14px', fontWeight: 600 }}>{c.symbole}</td>
                          <td style={{
                            padding: '8px 14px',
                            color: rsi ? (rsi > 70 ? 'var(--baissier)' : rsi < 30 ? 'var(--haussier)' : 'var(--text)') : 'var(--text-muted)',
                          }}>
                            {rsi ? rsi.toFixed(1) : '—'}
                          </td>
                          <td style={{ padding: '8px 14px', color: 'var(--text-muted)' }}>
                            {ind.mm20 ? ind.mm20.toFixed(4) : '—'}
                          </td>
                          <td style={{ padding: '8px 14px', color: 'var(--text-muted)' }}>
                            {ind.mm50 ? ind.mm50.toFixed(4) : '—'}
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <BadgeTendance tendance={ind.tendance} />
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                flex: 1,
                                height: 6,
                                background: 'var(--border)',
                                borderRadius: 3,
                                maxWidth: 100,
                              }}>
                                <div style={{
                                  width: `${ind.forceSignal ?? 0}%`,
                                  height: '100%',
                                  background: (ind.forceSignal ?? 0) > 70 ? 'var(--haussier)' : 'var(--accent)',
                                  borderRadius: 3,
                                }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {ind.forceSignal ?? 0}/100
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
