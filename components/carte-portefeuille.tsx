'use client';

// Carte KPI du portefeuille
interface Props {
  label: string;
  valeur: string;
  sous?: string;
  couleur?: string;
}

export default function CartePortefeuille({ label, valeur, sous, couleur }: Props) {
  return (
    <div className="carte">
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: couleur ?? 'var(--text)' }}>
        {valeur}
      </div>
      {sous && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{sous}</div>
      )}
    </div>
  );
}
