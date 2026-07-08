// Salle de réunion — journal des cycles de décision et messages des agents
import { listerPortefeuilles } from '@/lib/supabase/services/portefeuilles';
import { listerCycles, obtenirCycleAvecMessages } from '@/lib/supabase/services/cycles';
import SalleReunion from '@/components/salle-reunion';

export const dynamic = 'force-dynamic';

export default async function PageReunion() {
  let portefeuilles = [];
  try {
    portefeuilles = await listerPortefeuilles();
  } catch {
    return <SalleReunion cycles={[]} cycleDetaille={null} />;
  }

  const portefeuille = portefeuilles[0];
  if (!portefeuille) {
    return <SalleReunion cycles={[]} cycleDetaille={null} />;
  }

  const cycles = await listerCycles(portefeuille.id, 10).catch(() => []);
  const dernierCycleId = cycles[0]?.id;

  const cycleDetaille = dernierCycleId
    ? await obtenirCycleAvecMessages(dernierCycleId).catch(() => null)
    : null;

  return <SalleReunion cycles={cycles} cycleDetaille={cycleDetaille} />;
}
