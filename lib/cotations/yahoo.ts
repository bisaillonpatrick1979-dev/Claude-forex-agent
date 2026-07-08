// Service Yahoo Finance — Cotations de marché
// Utilise yahoo-finance2 (quote uniquement) + données historiques simulées
import type { Cotation, DonneesHistoriques, TypeMarche } from '@/types';
import { INSTRUMENTS } from '@/types';
import { obtenirClientServeur } from '@/lib/supabase/client';

// Durée du cache en secondes (15 minutes)
const DUREE_CACHE_SEC = 900;

// ─── Récupération d'une cotation ──────────────────────────────────

export async function obtenirCotation(symbole: string): Promise<Cotation | null> {
  // 1. Vérifier le cache Supabase
  const cache = await lireCache(symbole);
  if (cache) return cache;

  // 2. Appel Yahoo Finance via l'API interne (chart/v8)
  try {
    const prixBase = obtenirPrixDemo(symbole);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbole)}?interval=1d&range=1d`;
    const rep = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 900 },
    });

    if (!rep.ok) throw new Error(`HTTP ${rep.status}`);

    const json = await rep.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('Données manquantes');

    const prix = meta.regularMarketPrice ?? prixBase;
    const prixPrecedent = meta.previousClose ?? prix;
    const variation = prix - prixPrecedent;
    const variationPct = prixPrecedent !== 0 ? (variation / prixPrecedent) * 100 : 0;

    const instrument = INSTRUMENTS.find((i) => i.symbole === symbole);
    const cotation: Cotation = {
      symbole,
      nom: instrument?.nom ?? meta.symbol ?? symbole,
      marche: instrument?.marche ?? detecterMarche(symbole),
      prix,
      variation,
      variationPct,
      volumeJour: meta.regularMarketVolume,
      high24h: meta.regularMarketDayHigh,
      low24h: meta.regularMarketDayLow,
      derniereMaj: new Date().toISOString(),
    };

    await ecrireCache(symbole, cotation);
    return cotation;
  } catch (err) {
    console.error(`Erreur Yahoo Finance pour ${symbole}:`, err);
    return null;
  }
}

// ─── Récupération de toutes les cotations suivies ─────────────────

export async function obtenirToutesCotations(): Promise<Cotation[]> {
  const promesses = INSTRUMENTS.map((i) => obtenirCotation(i.symbole));
  const resultats = await Promise.allSettled(promesses);

  return resultats
    .filter((r): r is PromiseFulfilledResult<Cotation> => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value);
}

// ─── Données historiques (simulées à partir du prix actuel) ──────

export async function obtenirHistorique(
  symbole: string,
  jours = 30
): Promise<DonneesHistoriques[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbole)}?interval=1d&range=${jours}d`;
    const rep = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 900 },
    });

    if (!rep.ok) throw new Error(`HTTP ${rep.status}`);

    const json = await rep.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error('Données manquantes');

    const timestamps: number[] = result.timestamp ?? [];
    const quotes = result.indicators?.quote?.[0] ?? {};
    const opens: number[] = quotes.open ?? [];
    const highs: number[] = quotes.high ?? [];
    const lows: number[] = quotes.low ?? [];
    const closes: number[] = quotes.close ?? [];
    const volumes: number[] = quotes.volume ?? [];

    return timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      ouverture: opens[i] ?? 0,
      haut: highs[i] ?? 0,
      bas: lows[i] ?? 0,
      cloture: closes[i] ?? 0,
      volume: volumes[i] ?? 0,
    })).filter((h) => h.cloture > 0);
  } catch {
    // Fallback : données historiques simulées
    return genererHistoriqueDemo(symbole, jours);
  }
}

// ─── Gestion du cache Supabase ────────────────────────────────────

async function lireCache(symbole: string): Promise<Cotation | null> {
  try {
    const supabase = obtenirClientServeur();
    const { data } = await supabase
      .from('cotations_cache')
      .select('donnees_json, mis_a_jour_le')
      .eq('symbole', symbole)
      .single();

    if (!data) return null;

    const age = (Date.now() - new Date(data.mis_a_jour_le).getTime()) / 1000;
    if (age > DUREE_CACHE_SEC) return null;

    return data.donnees_json as Cotation;
  } catch {
    return null;
  }
}

async function ecrireCache(symbole: string, cotation: Cotation): Promise<void> {
  try {
    const supabase = obtenirClientServeur();
    await supabase.from('cotations_cache').upsert({
      symbole,
      donnees_json: cotation,
      mis_a_jour_le: new Date().toISOString(),
    });
  } catch {
    // Échec du cache non bloquant
  }
}

// ─── Utilitaires ──────────────────────────────────────────────────

function detecterMarche(symbole: string): TypeMarche {
  if (symbole.includes('=X')) return 'forex';
  if (symbole.includes('-USD') || symbole.includes('-BTC')) return 'crypto';
  return 'actions';
}

// ─── Données démo ─────────────────────────────────────────────────

export function obtenirCotationsDemo(): Cotation[] {
  return INSTRUMENTS.map((instrument) => {
    const prix = obtenirPrixDemo(instrument.symbole);
    const variation = (Math.round((Math.random() - 0.5) * 100) / 100) * 0.01 * prix;
    return {
      symbole: instrument.symbole,
      nom: instrument.nom,
      marche: instrument.marche,
      prix,
      variation,
      variationPct: (variation / prix) * 100,
      volumeJour: Math.floor(100000 + Math.random() * 9900000),
      high24h: prix * 1.005,
      low24h: prix * 0.995,
      derniereMaj: new Date().toISOString(),
    };
  });
}

function obtenirPrixDemo(symbole: string): number {
  const prix: Record<string, number> = {
    'EURUSD=X': 1.0852,
    'GBPUSD=X': 1.2634,
    'USDCAD=X': 1.3685,
    'QQQ': 482.35,
    'AAPL': 189.45,
    'MSFT': 412.78,
    'NVDA': 875.32,
    'TSLA': 248.67,
    'BTC-USD': 68_450.00,
    'ETH-USD': 3_215.80,
  };
  return prix[symbole] ?? 100;
}

function genererHistoriqueDemo(symbole: string, jours: number): DonneesHistoriques[] {
  const prixBase = obtenirPrixDemo(symbole);
  const historique: DonneesHistoriques[] = [];
  let prix = prixBase * 0.95;

  for (let i = jours; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const variation = (Math.random() - 0.48) * prix * 0.01;
    const ouverture = prix;
    const haut = prix + Math.abs(variation) * 1.5;
    const bas = prix - Math.abs(variation) * 1.2;
    prix = prix + variation;

    historique.push({
      date: date.toISOString().split('T')[0],
      ouverture,
      haut,
      bas,
      cloture: prix,
      volume: Math.floor(500_000 + Math.random() * 5_000_000),
    });
  }

  return historique;
}
