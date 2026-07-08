// Tableau de bord principal — vue d'ensemble du portefeuille
import { listerPortefeuilles, calculerValeurPortefeuille } from '@/lib/supabase/services/portefeuilles';
import { listerPositions } from '@/lib/supabase/services/positions';
import { obtenirDernierCycle } from '@/lib/supabase/services/cycles';
import { obtenirToutesCotations, obtenirCotationsDemo } from '@/lib/cotations/yahoo';
import { listerJournalPerformance } from '@/lib/supabase/services/config-agents';
import TableauDeBord from '@/components/tableau-de-bord';
import type { Portefeuille, Cotation, Position, CycleDecision } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PageTableauDeBord() {
  // Charger les données côté serveur
  let portefeuilles: Portefeuille[] = [];
  let cotations: Cotation[] = [];

  try {
    [portefeuilles, cotations] = await Promise.all([
      listerPortefeuilles(),
      obtenirToutesCotations().catch(() => obtenirCotationsDemo()),
    ]);
  } catch {
    cotations = obtenirCotationsDemo();
  }

  const portefeuille = portefeuilles[0] ?? null;

  let positions: Position[] = [];
  let dernierCycle: CycleDecision | null = null;
  let valeurPortefeuille: { pnlTotal: number; nbTrades: number; nbGagnants: number } | null = null;
  let journalPerf: Array<{ date: string; valeur: number; pnl: number }> = [];

  if (portefeuille) {
    [positions, dernierCycle, valeurPortefeuille, journalPerf] = await Promise.all([
      listerPositions(portefeuille.id, 'ouverte').catch(() => []),
      obtenirDernierCycle(portefeuille.id).catch(() => null),
      calculerValeurPortefeuille(portefeuille.id).catch(() => null),
      listerJournalPerformance(portefeuille.id, 30).catch(() => []),
    ]);
  }

  return (
    <TableauDeBord
      portefeuille={portefeuille}
      cotations={cotations}
      positions={positions}
      dernierCycle={dernierCycle}
      valeurPortefeuille={valeurPortefeuille}
      journalPerf={journalPerf}
    />
  );
}
