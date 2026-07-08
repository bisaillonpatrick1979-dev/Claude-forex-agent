'use client';

// Page Mémoire — leçons apprises + actualités en temps réel
import type { Lecon } from '@/lib/supabase/services/lecons';
import type { DonneesMarche } from '@/lib/donnees/sources-marche';
import type { NomAgent } from '@/types';

const COULEURS_AGENTS: Record<NomAgent, { fond: string; texte: string; label: string }> = {
  pdg: { fond: '#1e3a5f', texte: '#93c5fd', label: 'PDG' },
  analyseur_technique: { fond: '#14532d', texte: '#86efac', label: 'Analyste Technique' },
  analyseur_fondamental: { fond: '#713f12', texte: '#fde68a', label: 'Analyste Fondamental' },
  gestionnaire_risque: { fond: '#7f1d1d', texte: '#fca5a5', label: 'Gestionnaire de Risque' },
  trader_executeur: { fond: '#4c1d95', texte: '#c4b5fd', label: 'Trader Exécuteur' },
};

const ICONES_ERREUR: Record<string, string> = {
  signal_rsi_ignore: 'RSI ignoré',
  contre_tendance: 'Contre-tendance',
  stop_loss_trop_proche: 'SL trop proche',
  news_ignorees: 'News ignorées',
  volatilite_sous_estimee: 'Volatilité',
  mauvais_ratio_rr: 'Mauvais R/R',
  mauvais_timing: 'Timing',
  faux_signal: 'Faux signal',
};

interface Props {
  lecons: Lecon[];
  donneesMarche: DonneesMarche | null;
}

export default function PageMemoire({ lecons, donneesMarche }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1200 }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 4px' }}>Mémoire des agents</h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Leçons apprises des erreurs passées + données de marché en temps réel
        </p>
      </div>

      {/* Données de marché en temps réel */}
      {donneesMarche && (
        <div className="carte">
          <div style={{ fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            Données de marché en temps réel
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              (mis à jour : {new Date(donneesMarche.horodatage).toLocaleTimeString('fr-CA')})
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
            {donneesMarche.vix && (
              <div style={{ padding: '12px', background: 'var(--bg-panel)', borderRadius: 6 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>VIX</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: donneesMarche.vix.valeur > 30 ? 'var(--baissier)' : donneesMarche.vix.valeur < 15 ? 'var(--haussier)' : 'var(--text)' }}>
                  {donneesMarche.vix.valeur.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {donneesMarche.vix.interpretation}
                </div>
              </div>
            )}

            {donneesMarche.fearGreedIndex && (
              <div style={{ padding: '12px', background: 'var(--bg-panel)', borderRadius: 6 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fear & Greed</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: donneesMarche.fearGreedIndex.valeur > 60 ? 'var(--baissier)' : donneesMarche.fearGreedIndex.valeur < 40 ? 'var(--haussier)' : 'var(--text)' }}>
                  {donneesMarche.fearGreedIndex.valeur}/100
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {donneesMarche.fearGreedIndex.classification}
                </div>
              </div>
            )}

            <div style={{ padding: '12px', background: 'var(--bg-panel)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actualités</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{donneesMarche.actualites.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Sources analysées</div>
            </div>
          </div>

          {/* Actualités */}
          {donneesMarche.actualites.length > 0 && (
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 10, color: 'var(--text-muted)' }}>
                Dernières actualités financières
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {donneesMarche.actualites.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '8px 12px',
                      background: 'var(--bg-panel)',
                      borderRadius: 6,
                      fontSize: '0.8125rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', minWidth: 20 }}>{i + 1}.</span>
                    <div>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.65rem',
                        padding: '1px 5px',
                        background: '#1e293b',
                        color: 'var(--text-muted)',
                        borderRadius: 3,
                        marginRight: 6,
                      }}>
                        {a.source}
                      </span>
                      {a.lien ? (
                        <a href={a.lien} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', textDecoration: 'none' }}>
                          {a.titre}
                        </a>
                      ) : (
                        <span>{a.titre}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leçons apprises */}
      <div className="carte">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 600 }}>Leçons apprises ({lecons.length})</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Générées automatiquement après chaque trade perdant
          </div>
        </div>

        {lecons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📚</div>
            <div>Aucune leçon enregistrée pour le moment.</div>
            <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
              Les leçons apparaissent après l&apos;analyse des trades perdants.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lecons.map((lecon) => {
              const style = COULEURS_AGENTS[lecon.agent] ?? { fond: '#1e293b', texte: '#e2e8f0', label: lecon.agent };
              const contexte = lecon.contexte as Record<string, unknown> | undefined;
              return (
                <div
                  key={lecon.id}
                  style={{
                    padding: '12px 16px',
                    background: 'var(--bg-panel)',
                    borderLeft: `3px solid ${style.fond}`,
                    borderRadius: '0 6px 6px 0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: style.fond, color: style.texte, fontWeight: 600 }}>
                      {style.label}
                    </span>
                    {lecon.symbole && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, background: '#1e3a5f', color: '#60a5fa' }}>
                        {lecon.symbole}
                      </span>
                    )}
                    {lecon.typeErreur && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {ICONES_ERREUR[lecon.typeErreur] ?? lecon.typeErreur}
                      </span>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {new Date(lecon.cree_le).toLocaleDateString('fr-CA')}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{lecon.lecon}</div>

                  {contexte && typeof contexte.pnl === 'number' && (
                    <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--baissier)' }}>
                      P&L : {contexte.pnl.toFixed(2)} CAD
                      {typeof contexte.direction === 'string' && ` | ${contexte.direction}`}
                      {typeof contexte.prixEntree === 'number' && ` @ ${contexte.prixEntree.toFixed(4)}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
