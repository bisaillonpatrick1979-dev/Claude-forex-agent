// Page Mémoire — leçons apprises par les agents + actualités de marché
import { listerPortefeuilles } from '@/lib/supabase/services/portefeuilles';
import { listerToutesLecons } from '@/lib/supabase/services/lecons';
import { obtenirDonneesMarche } from '@/lib/donnees/sources-marche';
import PageMemoire from '@/components/page-memoire';
import type { Lecon } from '@/lib/supabase/services/lecons';
import type { DonneesMarche } from '@/lib/donnees/sources-marche';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RouteMemoire() {
  let lecons: Lecon[] = [];
  let donneesMarche: DonneesMarche | null = null;

  try {
    const [portefeuilles, donnees] = await Promise.all([
      listerPortefeuilles(),
      obtenirDonneesMarche('EURUSD=X'),
    ]);

    const portefeuille = portefeuilles[0];
    if (portefeuille) {
      lecons = await listerToutesLecons(portefeuille.id, 50).catch(() => []);
    }
    donneesMarche = donnees;
  } catch {
    // Supabase ou réseau non disponible
  }

  return <PageMemoire lecons={lecons} donneesMarche={donneesMarche} />;
}
