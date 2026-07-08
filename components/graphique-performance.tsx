'use client';

// Graphique de performance avec Recharts
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Donnee {
  date: string;
  valeur: number;
  pnl: number;
}

interface Props {
  donnees: Donnee[];
}

export default function GraphiquePerformance({ donnees }: Props) {
  const min = Math.min(...donnees.map((d) => d.valeur)) * 0.998;
  const max = Math.max(...donnees.map((d) => d.valeur)) * 1.002;

  const formaterDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const formaterValeur = (v: number) =>
    v.toLocaleString('fr-CA', { maximumFractionDigits: 0 });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={donnees} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="gradientValeur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={formaterDate}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[min, max]}
          tickFormatter={formaterValeur}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip
          contentStyle={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(val: number) => [formaterValeur(val) + ' CAD', 'Valeur']}
          labelFormatter={formaterDate}
        />
        <Area
          type="monotone"
          dataKey="valeur"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#gradientValeur)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
