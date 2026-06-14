import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'ForexAgent Pro — Trading IA Multi-Agents',
  description: 'Plateforme de trading Forex propulsée par des agents IA spécialisés',
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B0E11',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#0B0E11] text-[#D1D4DC] overflow-hidden h-screen">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1C2230',
              color: '#D1D4DC',
              border: '1px solid #2A2E3D',
              fontSize: '12px',
            },
            success: { iconTheme: { primary: '#089981', secondary: '#0B0E11' } },
            error: { iconTheme: { primary: '#F23645', secondary: '#0B0E11' } },
          }}
        />
      </body>
    </html>
  );
}
