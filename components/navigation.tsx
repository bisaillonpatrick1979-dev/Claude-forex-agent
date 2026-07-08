'use client';

// Navigation latérale de TradingLab IA
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LIENS = [
  { href: '/', label: 'Tableau de bord', icone: '📊' },
  { href: '/reunion', label: 'Salle de réunion', icone: '🤝' },
  { href: '/historique', label: 'Historique', icone: '📋' },
  { href: '/marches', label: 'Marchés', icone: '📈' },
  { href: '/reglages', label: 'Réglages', icone: '⚙️' },
];

export default function Navigation() {
  const chemin = usePathname();

  return (
    <nav
      style={{
        width: 220,
        minHeight: '100%',
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '8px 12px 20px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>TradingLab IA</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Simulation multi-agents</div>
      </div>

      {LIENS.map(({ href, label, icone }) => (
        <Link
          key={href}
          href={href}
          className={`nav-lien${chemin === href ? ' actif' : ''}`}
          style={chemin === href ? { background: 'var(--bg-panel)', color: 'var(--text)' } : {}}
        >
          <span>{icone}</span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
