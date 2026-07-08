// Sources de données de marché en temps réel — toutes gratuites, sans clé
// Sources : Yahoo Finance News, Fear & Greed Index (Alternative.me), VIX

export interface Actualite {
  titre: string;
  source: string;
  lien?: string;
  datePublication?: string;
}

export interface DonneesMarche {
  actualites: Actualite[];
  fearGreedIndex?: { valeur: number; classification: string };
  vix?: { valeur: number; interpretation: string };
  horodatage: string;
}

// ─── Actualités Yahoo Finance ─────────────────────────────────────

async function obtenirActualitesYahoo(symbole: string): Promise<Actualite[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbole)}&newsCount=5&enableFuzzyQuery=false`;
    const rep = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 600 },
    });
    if (!rep.ok) return [];

    const json = await rep.json();
    const news = json?.news ?? [];

    return news.slice(0, 5).map((n: Record<string, unknown>) => ({
      titre: n.title as string ?? '',
      source: n.publisher as string ?? 'Yahoo Finance',
      lien: n.link as string ?? undefined,
      datePublication: n.providerPublishTime
        ? new Date((n.providerPublishTime as number) * 1000).toISOString()
        : undefined,
    })).filter((a: Actualite) => a.titre);
  } catch {
    return [];
  }
}

// ─── Fear & Greed Index (Alternative.me) ─────────────────────────

async function obtenirFearGreed(): Promise<{ valeur: number; classification: string } | undefined> {
  try {
    const rep = await fetch('https://api.alternative.me/fng/?limit=1', {
      next: { revalidate: 3600 },
    });
    if (!rep.ok) return undefined;

    const json = await rep.json();
    const donnees = json?.data?.[0];
    if (!donnees) return undefined;

    const valeur = parseInt(donnees.value);
    return {
      valeur,
      classification: traduitClassification(donnees.value_classification as string),
    };
  } catch {
    return undefined;
  }
}

function traduitClassification(eng: string): string {
  const map: Record<string, string> = {
    'Extreme Fear': 'Peur extrême',
    'Fear': 'Peur',
    'Neutral': 'Neutre',
    'Greed': 'Avidité',
    'Extreme Greed': 'Avidité extrême',
  };
  return map[eng] ?? eng;
}

// ─── VIX (Indice de volatilité S&P 500) ──────────────────────────

async function obtenirVIX(): Promise<{ valeur: number; interpretation: string } | undefined> {
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d';
    const rep = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 900 },
    });
    if (!rep.ok) return undefined;

    const json = await rep.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return undefined;

    const valeur = meta.regularMarketPrice as number;
    let interpretation = 'Modéré';
    if (valeur < 15) interpretation = 'Très faible (marchés calmes)';
    else if (valeur < 20) interpretation = 'Faible (optimisme)';
    else if (valeur < 30) interpretation = 'Modéré (incertitude)';
    else if (valeur < 40) interpretation = 'Élevé (stress du marché)';
    else interpretation = 'Très élevé (panique)';

    return { valeur, interpretation };
  } catch {
    return undefined;
  }
}

// ─── Actualités générales via RSS Reuters ────────────────────────

async function obtenirActualitesRSS(): Promise<Actualite[]> {
  try {
    // Utiliser un proxy RSS-to-JSON gratuit (rss2json.com ou similaire)
    const url = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.reuters.com%2Freuters%2FbusinessNews&count=5';
    const rep = await fetch(url, { next: { revalidate: 1800 } });
    if (!rep.ok) return [];

    const json = await rep.json();
    const items: Record<string, unknown>[] = json?.items ?? [];

    return items.slice(0, 5).map((item) => ({
      titre: item.title as string ?? '',
      source: 'Reuters',
      lien: item.link as string ?? undefined,
      datePublication: item.pubDate as string ?? undefined,
    })).filter((a) => a.titre);
  } catch {
    return [];
  }
}

// ─── Agrégation de toutes les sources ────────────────────────────

export async function obtenirDonneesMarche(symbole: string): Promise<DonneesMarche> {
  const [actualitesYahoo, actualitesRSS, fearGreed, vix] = await Promise.allSettled([
    obtenirActualitesYahoo(symbole),
    obtenirActualitesRSS(),
    obtenirFearGreed(),
    obtenirVIX(),
  ]);

  const actu1 = actualitesYahoo.status === 'fulfilled' ? actualitesYahoo.value : [];
  const actu2 = actualitesRSS.status === 'fulfilled' ? actualitesRSS.value : [];

  // Fusionner et dédupliquer les actualités
  const titresVus = new Set<string>();
  const actualites: Actualite[] = [];
  for (const a of [...actu1, ...actu2]) {
    if (!titresVus.has(a.titre)) {
      titresVus.add(a.titre);
      actualites.push(a);
    }
    if (actualites.length >= 8) break;
  }

  return {
    actualites,
    fearGreedIndex: fearGreed.status === 'fulfilled' ? fearGreed.value : undefined,
    vix: vix.status === 'fulfilled' ? vix.value : undefined,
    horodatage: new Date().toISOString(),
  };
}

// ─── Formater pour les agents ─────────────────────────────────────

export function formaterDonneesMarche(donnees: DonneesMarche): string {
  const lignes: string[] = ['=== DONNÉES DE MARCHÉ EN TEMPS RÉEL ==='];

  if (donnees.vix) {
    lignes.push(`VIX : ${donnees.vix.valeur.toFixed(2)} — ${donnees.vix.interpretation}`);
  }

  if (donnees.fearGreedIndex) {
    lignes.push(`Fear & Greed (crypto) : ${donnees.fearGreedIndex.valeur}/100 — ${donnees.fearGreedIndex.classification}`);
  }

  if (donnees.actualites.length > 0) {
    lignes.push('');
    lignes.push('Actualités financières récentes :');
    donnees.actualites.slice(0, 5).forEach((a, i) => {
      lignes.push(`${i + 1}. [${a.source}] ${a.titre}`);
    });
  }

  return lignes.join('\n');
}
