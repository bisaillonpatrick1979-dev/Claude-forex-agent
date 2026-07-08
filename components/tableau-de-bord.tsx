'use client';

// Composant client du tableau de bord
import type { Portefeuille, Cotation, Position, CycleDecision } from '@/types';
import CarteCotation from './carte-cotation';
import GraphiquePerformance from './graphique-performance';
import CartePortefeuille from './carte-portefeuille';
import BoutonCycle from './bouton-cycle';
import TablePositions from './table-positions';

interface Props {
  portefeuille: Portefeuille | null;
  cotations: Cotation[];
  positions: Position[];
  dernierCycle: CycleDecision | null;
  valeurPortefeuille: { pnlTotal: number; nbTrades: number; nbGagnants: number } | null;
  journalPerf: Array<{ date: string; valeur: number; pnl: number }>;
}

export default function TableauDeBord({
  portefeuille,
  cotations,
  positions,
  dernierCycle,
  valeurPortefeuille,
  journalPerf,
}: Props) {
  const forex = cotations.filter((c) => c.marche === 'forex');
  const actions = cotations.filter((c) => c.marche === 'actions');
  const crypto = cotations.filter((c) => c.marche === 'crypto');

  if (!portefeuille) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80, color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>📊</div>
        <div style={{ fontWeight: 600 }}>Aucun portefeuille configuré</div>
        <div style={{ marginTop: 8, fontSize: '0.875rem' }}>
          Exécutez le schéma SQL Supabase pour initialiser la base de données.
        </div>
      </div>
    );
  }

  const tauxReussite =
    valeurPortefeuille && valeurPortefeuille.nbTrades > 0
      ? ((valeurPortefeuille.nbGagnants / valeurPortefeuille.nbTrades) * 100).toFixed(1)
      : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1400 }}>
      {/* En-tête + bouton cycle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{portefeuille.nom}</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Portefeuille simulé — {portefeuille.devise} — {portefeuille.statut}
          </div>
        </div>
        <BoutonCycle portefeuilleId={portefeuille.id} />
      </div>

      {/* KPIs du portefeuille */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <CartePortefeuille
          label="Capital actuel"
          valeur={`${portefeuille.capitalActuel.toLocaleString('fr-CA', { maximumFractionDigits: 2 })} ${portefeuille.devise}`}
          sous={`Initial : ${portefeuille.capitalInitial.toLocaleString('fr-CA')} ${portefeuille.devise}`}
        />
        <CartePortefeuille
          label="P&L total"
          valeur={`${(valeurPortefeuille?.pnlTotal ?? 0) >= 0 ? '+' : ''}${(valeurPortefeuille?.pnlTotal ?? 0).toFixed(2)} ${portefeuille.devise}`}
          sous={`${valeurPortefeuille?.nbTrades ?? 0} trades exécutés`}
          couleur={(valeurPortefeuille?.pnlTotal ?? 0) >= 0 ? 'var(--haussier)' : 'var(--baissier)'}
        />
        <CartePortefeuille
          label="Taux de réussite"
          valeur={`${tauxReussite}%`}
          sous={`${valeurPortefeuille?.nbGagnants ?? 0} / ${valeurPortefeuille?.nbTrades ?? 0} gagnants`}
        />
        <CartePortefeuille
          label="Positions ouvertes"
          valeur={String(positions.length)}
          sous="En cours de simulation"
        />
      </div>

      {/* Graphique de performance */}
      {journalPerf.length > 0 && (
        <div className="carte">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Performance (30 jours)</div>
          <GraphiquePerformance donnees={journalPerf} />
        </div>
      )}

      {/* Cotations par marché */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Forex</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {forex.map((c) => <CarteCotation key={c.symbole} cotation={c} />)}
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {actions.map((c) => <CarteCotation key={c.symbole} cotation={c} />)}
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Crypto</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {crypto.map((c) => <CarteCotation key={c.symbole} cotation={c} />)}
        </div>
      </div>

      {/* Positions ouvertes */}
      {positions.length > 0 && (
        <div className="carte">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Positions ouvertes</div>
          <TablePositions positions={positions} cotations={cotations} />
        </div>
      )}

      {/* Dernier cycle */}
      {dernierCycle && (
        <div className="carte">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Dernier cycle de trading</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <span>Déclenché par : <strong>{dernierCycle.declenchePar}</strong></span>
            {' | '}
            <span>Décision : <strong style={{ color: dernierCycle.decisionFinale === 'achat' ? 'var(--haussier)' : dernierCycle.decisionFinale === 'vente' ? 'var(--baissier)' : 'var(--text)' }}>{dernierCycle.decisionFinale ?? 'en cours'}</strong></span>
            {' | '}
            <span>Trades : <strong>{dernierCycle.nbTradesExecutes ?? 0}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
