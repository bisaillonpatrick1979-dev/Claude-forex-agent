'use client';

// Page Réglages — affichage et modification de la configuration
import { useState } from 'react';
import type { ConfigAgent, Portefeuille, NomFournisseur } from '@/types';
import { TAILLES_POLICE, utiliserPortefeuilleStore } from '@/store/portefeuille-store';

const LABELS_AGENTS: Record<string, string> = {
  pdg: 'PDG',
  analyseur_technique: 'Analyste Technique',
  analyseur_fondamental: 'Analyste Fondamental',
  gestionnaire_risque: 'Gestionnaire de Risque',
  trader_executeur: 'Trader Exécuteur',
};

const MODELES_PAR_FOURNISSEUR: Record<NomFournisseur, string[]> = {
  mock: ['mock-v1'],
  anthropic: ['claude-haiku-4-5-20251001', 'claude-sonnet-5'],
  gemini: ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash'],
  openai: ['gpt-4o-mini', 'gpt-4o'],
};

interface Props {
  configAgents: ConfigAgent[];
  portefeuilles: Portefeuille[];
  modeIA: string;
}

export default function PageReglages({ configAgents, portefeuilles, modeIA }: Props) {
  const { taillePolicePx, definirTaillePolice } = utiliserPortefeuilleStore();
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);

  const mettreAJourAgent = async (
    agent: string,
    fournisseur: NomFournisseur,
    modele: string
  ) => {
    setEnCours(agent);
    setMessage(null);
    try {
      const rep = await fetch('/api/config-agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent, fournisseur, modele }),
      });
      if (rep.ok) {
        setMessage(`Configuration de ${LABELS_AGENTS[agent] ?? agent} mise à jour`);
      } else {
        setMessage('Erreur lors de la mise à jour');
      }
    } catch {
      setMessage('Erreur réseau');
    } finally {
      setEnCours(null);
    }
  };

  const testerFournisseur = async (agent: string, fournisseur: NomFournisseur, modele: string) => {
    setEnCours(`test-${agent}`);
    setMessage(null);
    try {
      const rep = await fetch('/api/config-agents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fournisseur, modele }),
      });
      const data = await rep.json();
      setMessage(data.message ?? (rep.ok ? 'Connexion OK' : 'Échec'));
    } catch {
      setMessage('Erreur réseau');
    } finally {
      setEnCours(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 900 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Réglages</h1>

      {/* Statut du mode IA */}
      <div className="carte">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Mode IA</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: '0.875rem',
              fontWeight: 600,
              background: modeIA === 'live' ? '#14532d' : '#1e3a5f',
              color: modeIA === 'live' ? '#86efac' : '#93c5fd',
            }}
          >
            {modeIA === 'live' ? 'Mode LIVE (clés API réelles)' : 'Mode MOCK (simulation sans clé API)'}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
          Définissez <code>IA_MODE=live</code> dans votre fichier <code>.env.local</code> pour activer les vrais modèles IA.
        </div>
      </div>

      {/* Taille de police */}
      <div className="carte">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Taille de l&apos;interface</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {TAILLES_POLICE.map(({ px, label }) => (
            <button
              key={px}
              onClick={() => definirTaillePolice(px)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: '0.875rem',
                border: '1px solid var(--border)',
                background: taillePolicePx === px ? 'var(--accent)' : 'var(--bg-panel)',
                color: taillePolicePx === px ? 'white' : 'var(--text)',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Configuration des agents */}
      <div className="carte">
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Configuration des agents IA</div>
        {configAgents.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Aucune configuration trouvée — vérifiez votre connexion Supabase.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {configAgents.map((config) => (
              <ConfigAgent
                key={config.id}
                config={config}
                enCours={enCours}
                onSauvegarder={mettreAJourAgent}
                onTester={testerFournisseur}
              />
            ))}
          </div>
        )}
      </div>

      {/* Portefeuilles */}
      <div className="carte">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Portefeuilles simulés</div>
        {portefeuilles.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucun portefeuille.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {portefeuilles.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{p.nom}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 8 }}>{p.profil}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600 }}>{p.capitalActuel.toLocaleString('fr-CA')} {p.devise}</div>
                  <div style={{ fontSize: '0.75rem', color: p.statut === 'actif' ? 'var(--haussier)' : 'var(--baissier)' }}>{p.statut}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message de retour */}
      {message && (
        <div style={{ padding: '10px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.875rem' }}>
          {message}
        </div>
      )}
    </div>
  );
}

// Sous-composant pour un agent
function ConfigAgent({
  config,
  enCours,
  onSauvegarder,
  onTester,
}: {
  config: ConfigAgent;
  enCours: string | null;
  onSauvegarder: (agent: string, fournisseur: NomFournisseur, modele: string) => void;
  onTester: (agent: string, fournisseur: NomFournisseur, modele: string) => void;
}) {
  const [fournisseur, setFournisseur] = useState<NomFournisseur>(config.fournisseur);
  const [modele, setModele] = useState(config.modele);
  const modeles = MODELES_PAR_FOURNISSEUR[fournisseur] ?? ['mock-v1'];

  const changerFournisseur = (f: NomFournisseur) => {
    setFournisseur(f);
    setModele(MODELES_PAR_FOURNISSEUR[f]?.[0] ?? 'mock-v1');
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 180, fontWeight: 500 }}>{LABELS_AGENTS[config.agent] ?? config.agent}</div>

      <select
        value={fournisseur}
        onChange={(e) => changerFournisseur(e.target.value as NomFournisseur)}
        style={{ padding: '6px 10px', background: 'var(--bg-panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.875rem' }}
      >
        {(['mock', 'anthropic', 'gemini', 'openai'] as NomFournisseur[]).map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>

      <select
        value={modele}
        onChange={(e) => setModele(e.target.value)}
        style={{ padding: '6px 10px', background: 'var(--bg-panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.875rem' }}
      >
        {modeles.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>

      <button
        onClick={() => onSauvegarder(config.agent, fournisseur, modele)}
        disabled={enCours === config.agent}
        style={{ padding: '6px 12px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }}
      >
        {enCours === config.agent ? '...' : 'Sauvegarder'}
      </button>

      <button
        onClick={() => onTester(config.agent, fournisseur, modele)}
        disabled={enCours === `test-${config.agent}`}
        style={{ padding: '6px 12px', background: 'var(--bg-panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }}
      >
        {enCours === `test-${config.agent}` ? '...' : 'Tester'}
      </button>
    </div>
  );
}
