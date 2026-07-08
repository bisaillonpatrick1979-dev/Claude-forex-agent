'use client';

// Salle de réunion — affichage des cycles et messages des agents
import type { CycleDecision, MessageAgentDB, NomAgent } from '@/types';

interface Props {
  cycles: CycleDecision[];
  cycleDetaille: CycleDecision | null;
}

// Couleurs par agent
const COULEURS_AGENTS: Record<NomAgent, { fond: string; texte: string; label: string }> = {
  pdg: { fond: '#1e3a5f', texte: '#93c5fd', label: 'PDG' },
  analyseur_technique: { fond: '#14532d', texte: '#86efac', label: 'Analyste Technique' },
  analyseur_fondamental: { fond: '#713f12', texte: '#fde68a', label: 'Analyste Fondamental' },
  gestionnaire_risque: { fond: '#7f1d1d', texte: '#fca5a5', label: 'Gestionnaire de Risque' },
  trader_executeur: { fond: '#4c1d95', texte: '#c4b5fd', label: 'Trader Exécuteur' },
};

function BulleMessage({ message }: { message: MessageAgentDB }) {
  const style = COULEURS_AGENTS[message.agent] ?? { fond: '#1e293b', texte: '#e2e8f0', label: message.agent };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span
          style={{
            fontSize: '0.7rem',
            padding: '2px 8px',
            borderRadius: 4,
            background: style.fond,
            color: style.texte,
            fontWeight: 600,
          }}
        >
          {style.label}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {message.modele} via {message.fournisseur}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {new Date(message.cree_le).toLocaleTimeString('fr-CA')}
        </span>
      </div>
      <div
        style={{
          background: 'var(--bg-card)',
          border: `1px solid ${style.fond}`,
          borderRadius: 8,
          padding: '12px 16px',
          fontSize: '0.8125rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          color: 'var(--text)',
        }}
      >
        {message.contenu}
      </div>
    </div>
  );
}

export default function SalleReunion({ cycles, cycleDetaille }: Props) {
  if (cycles.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80, color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>🤝</div>
        <div style={{ fontWeight: 600 }}>Aucun cycle de trading enregistré</div>
        <div style={{ marginTop: 8, fontSize: '0.875rem' }}>
          Lancez un cycle depuis le tableau de bord pour voir les discussions des agents.
        </div>
      </div>
    );
  }

  const messages = cycleDetaille?.messages ?? [];

  return (
    <div style={{ display: 'flex', gap: 24, maxWidth: 1400 }}>
      {/* Liste des cycles */}
      <div style={{ width: 260, flexShrink: 0 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Cycles récents</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cycles.map((cycle) => (
            <a
              key={cycle.id}
              href={`/reunion?cycle=${cycle.id}`}
              style={{
                display: 'block',
                padding: '10px 12px',
                background: cycle.id === cycleDetaille?.id ? 'var(--bg-panel)' : 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                textDecoration: 'none',
                color: 'var(--text)',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                {new Date(cycle.execute_le).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {cycle.declenchePar} —{' '}
                <span style={{
                  color: cycle.decisionFinale === 'achat' ? 'var(--haussier)' : cycle.decisionFinale === 'vente' ? 'var(--baissier)' : 'var(--text-muted)'
                }}>
                  {cycle.decisionFinale ?? 'en cours'}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Messages du cycle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {cycleDetaille ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                Réunion du {new Date(cycleDetaille.execute_le).toLocaleString('fr-CA', { dateStyle: 'long', timeStyle: 'short' })}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {messages.length} message(s)
              </span>
            </div>
            <div>
              {messages.map((msg) => (
                <BulleMessage key={msg.id} message={msg} />
              ))}
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', marginTop: 40, textAlign: 'center' }}>
            Sélectionnez un cycle pour voir les messages
          </div>
        )}
      </div>
    </div>
  );
}
