import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/navigation';

export const metadata: Metadata = {
  title: 'TradingLab IA — Simulation de trading par agents IA',
  description: 'Société de trading fictive pilotée par des agents IA — argent fictif uniquement',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Bannière obligatoire — argent fictif */}
        <div className="bandeau-simulation">
          Simulation — Argent fictif — Aucun trade réel n&apos;est jamais exécuté
        </div>

        <div style={{ display: 'flex', flex: 1 }}>
          <Navigation />
          <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
