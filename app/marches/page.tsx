// Page marchés — cotations en temps réel et données historiques
import { obtenirToutesCotations, obtenirCotationsDemo, obtenirHistorique } from '@/lib/cotations/yahoo';
import { calculerIndicateurs } from '@/lib/cotations/indicateurs';
import { INSTRUMENTS, type IndicateursTechniques, type DonneesHistoriques } from '@/types';
import PageMarches from '@/components/page-marches';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PageMarchesRoute() {
  let cotations = [];
  try {
    cotations = await obtenirToutesCotations();
    if (cotations.length === 0) cotations = obtenirCotationsDemo();
  } catch {
    cotations = obtenirCotationsDemo();
  }

  // Charger les historiques et indicateurs pour les premiers instruments
  const historiquesEntries = await Promise.allSettled(
    INSTRUMENTS.slice(0, 5).map(async (inst) => {
      const hist = await obtenirHistorique(inst.symbole, 60).catch(() => []);
      const ind = calculerIndicateurs(hist);
      return { symbole: inst.symbole, historique: hist, indicateurs: ind };
    })
  );

  const donneesParSymbole: Record<string, { historique: DonneesHistoriques[]; indicateurs: IndicateursTechniques }> = {};
  for (const res of historiquesEntries) {
    if (res.status === 'fulfilled') {
      donneesParSymbole[res.value.symbole] = {
        historique: res.value.historique,
        indicateurs: res.value.indicateurs,
      };
    }
  }

  return <PageMarches cotations={cotations} donneesParSymbole={donneesParSymbole} />;
}
