// API /api/cycle — déclenche un cycle de trading (manuel ou cron)
// Sécurisé par CRON_SECRET pour les appels automatisés
import { NextRequest, NextResponse } from 'next/server';
import { lancerCycle } from '@/lib/agents/orchestrateur';
import { listerPortefeuilles, obtenirPortefeuille } from '@/lib/supabase/services/portefeuilles';
import { obtenirToutesCotations, obtenirCotationsDemo, obtenirHistorique } from '@/lib/cotations/yahoo';
import { calculerIndicateurs } from '@/lib/cotations/indicateurs';
import { INSTRUMENTS } from '@/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Authentification : CRON_SECRET ou appel manuel
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  const estAppelCron = authHeader === `Bearer ${cronSecret}`;
  const corps = await req.json().catch(() => ({}));
  const estAppelManuel = !!corps.portefeuilleId;

  if (!estAppelCron && !estAppelManuel) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    // Déterminer le portefeuille à utiliser
    let portefeuilleId = corps.portefeuilleId as string | undefined;
    let portefeuille = null;

    if (portefeuilleId) {
      portefeuille = await obtenirPortefeuille(portefeuilleId);
    } else {
      // Appel cron — utiliser tous les portefeuilles actifs
      const portefeuilles = await listerPortefeuilles();
      const actifs = portefeuilles.filter((p) => p.statut === 'actif');
      if (actifs.length === 0) {
        return NextResponse.json({ message: 'Aucun portefeuille actif' }, { status: 200 });
      }
      portefeuille = actifs[0];
      portefeuilleId = portefeuille.id;
    }

    if (!portefeuille) {
      return NextResponse.json({ error: 'Portefeuille introuvable' }, { status: 404 });
    }

    // Récupérer les cotations
    let cotations = await obtenirToutesCotations().catch(() => []);
    if (cotations.length === 0) cotations = obtenirCotationsDemo();

    // Récupérer les historiques et indicateurs
    const historiques: Record<string, Awaited<ReturnType<typeof obtenirHistorique>>> = {};
    const indicateurs: Record<string, ReturnType<typeof calculerIndicateurs>> = {};

    await Promise.allSettled(
      INSTRUMENTS.map(async (inst) => {
        const hist = await obtenirHistorique(inst.symbole, 60).catch(() => []);
        historiques[inst.symbole] = hist;
        indicateurs[inst.symbole] = calculerIndicateurs(hist);
      })
    );

    // Lancer le cycle
    const declenchePar = corps.declenchePar ?? (estAppelCron ? 'cron' : 'manuel');
    const resultat = await lancerCycle({
      portefeuilleId: portefeuille.id,
      cotations,
      historiques,
      indicateurs,
      declenchePar,
      portefeuille,
    });

    return NextResponse.json(resultat, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Erreur cycle de trading :', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Vercel Cron — déclenchement automatique quotidien
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Déléguer au POST avec marquage cron
  const fakeReq = new NextRequest(req.url, {
    method: 'POST',
    headers: { 'authorization': authHeader, 'content-type': 'application/json' },
    body: JSON.stringify({ declenchePar: 'cron' }),
  });

  return POST(fakeReq);
}
