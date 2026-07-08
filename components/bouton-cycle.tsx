'use client';

// Bouton pour lancer manuellement un cycle de trading
import { useState } from 'react';

interface Props {
  portefeuilleId: string;
}

export default function BoutonCycle({ portefeuilleId }: Props) {
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const lancerCycle = async () => {
    setEnCours(true);
    setMessage(null);
    try {
      const rep = await fetch('/api/cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portefeuilleId, declenchePar: 'manuel' }),
      });
      const data = await rep.json();
      if (rep.ok) {
        setMessage(`Cycle terminé — décision : ${data.decisionFinale ?? 'attente'} (${data.nbTradesExecutes ?? 0} trade(s))`);
      } else {
        setMessage(`Erreur : ${data.error ?? 'inconnue'}`);
      }
    } catch (err) {
      setMessage('Erreur réseau — réessayez');
    } finally {
      setEnCours(false);
      // Recharger la page après 2 secondes pour afficher les nouvelles données
      setTimeout(() => window.location.reload(), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      <button
        onClick={lancerCycle}
        disabled={enCours}
        style={{
          padding: '10px 20px',
          background: enCours ? '#334155' : 'var(--accent)',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: enCours ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {enCours ? (
          <>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
            Cycle en cours...
          </>
        ) : (
          '▶ Lancer un cycle'
        )}
      </button>
      {message && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 300, textAlign: 'right' }}>
          {message}
        </div>
      )}
    </div>
  );
}
