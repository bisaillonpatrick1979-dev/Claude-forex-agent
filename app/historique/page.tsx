// Historique des trades — positions fermées
import { listerPortefeuilles } from '@/lib/supabase/services/portefeuilles';
import { listerPositions } from '@/lib/supabase/services/positions';
import HistoriqueTrades from '@/components/historique-trades';

export const dynamic = 'force-dynamic';

export default async function PageHistorique() {
  let positions: Awaited<ReturnType<typeof listerPositions>> = [];

  try {
    const portefeuilles = await listerPortefeuilles();
    const portefeuille = portefeuilles[0];

    if (portefeuille) {
      positions = await listerPositions(portefeuille.id, 'fermee');
    }
  } catch {
    // Supabase non configuré
  }

  return <HistoriqueTrades positions={positions} />;
}
