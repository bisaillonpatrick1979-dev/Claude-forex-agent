import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        chart: {
          bg: '#0B0E11',
          card: '#131722',
          panel: '#1C2230',
          border: '#2A2E3D',
          text: '#D1D4DC',
          muted: '#787B86',
          accent: '#2962FF',
          green: '#089981',
          red: '#F23645',
          yellow: '#F7A600',
          purple: '#9C27B0',
          gold: '#F5A623',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-green': 'pulse-green 1s ease-in-out',
        'fade-in': 'fade-in 0.3s ease-in-out',
        'slide-up': 'slide-up 0.3s ease-in-out',
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { color: '#089981' },
          '50%': { color: '#0dcfb0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
