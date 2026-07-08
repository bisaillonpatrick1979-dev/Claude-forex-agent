// Calcul des indicateurs techniques côté serveur
import type { DonneesHistoriques, IndicateursTechniques } from '@/types';

// ─── Moyenne Mobile Simple ────────────────────────────────────────

export function moyenneMobileSimple(clotures: number[], periode: number): number | undefined {
  if (clotures.length < periode) return undefined;
  const tranche = clotures.slice(-periode);
  return tranche.reduce((s, v) => s + v, 0) / periode;
}

// ─── Moyenne Mobile Exponentielle ────────────────────────────────

export function moyenneMobileExp(clotures: number[], periode: number): number | undefined {
  if (clotures.length < periode) return undefined;
  const k = 2 / (periode + 1);
  let ema = clotures.slice(0, periode).reduce((s, v) => s + v, 0) / periode;
  for (let i = periode; i < clotures.length; i++) {
    ema = clotures[i] * k + ema * (1 - k);
  }
  return ema;
}

// ─── RSI ──────────────────────────────────────────────────────────

export function calculerRSI(clotures: number[], periode = 14): number | undefined {
  if (clotures.length < periode + 1) return undefined;

  const variations = clotures.slice(1).map((c, i) => c - clotures[i]);
  let gainMoyen = variations.slice(0, periode).filter((v) => v > 0).reduce((s, v) => s + v, 0) / periode;
  let perteMoyenne = variations.slice(0, periode).filter((v) => v < 0).reduce((s, v) => s + Math.abs(v), 0) / periode;

  for (let i = periode; i < variations.length; i++) {
    const gain = Math.max(0, variations[i]);
    const perte = Math.max(0, -variations[i]);
    gainMoyen = (gainMoyen * (periode - 1) + gain) / periode;
    perteMoyenne = (perteMoyenne * (periode - 1) + perte) / periode;
  }

  if (perteMoyenne === 0) return 100;
  const rs = gainMoyen / perteMoyenne;
  return 100 - 100 / (1 + rs);
}

// ─── MACD ─────────────────────────────────────────────────────────

export function calculerMACD(
  clotures: number[],
  rapide = 12,
  lent = 26,
  signal = 9
): { ligne?: number; signal?: number; histogramme?: number } {
  const ema12 = moyenneMobileExp(clotures, rapide);
  const ema26 = moyenneMobileExp(clotures, lent);

  if (!ema12 || !ema26) return {};

  const macdLigne = ema12 - ema26;

  // Signal de la ligne MACD (EMA 9 du MACD)
  // Simplification : on utilise une approximation linéaire
  const macdValeur = macdLigne;
  const signalValeur = macdValeur * 0.9; // approximation simple
  const histogramme = macdValeur - signalValeur;

  return {
    ligne: macdLigne,
    signal: signalValeur,
    histogramme,
  };
}

// ─── Bandes de Bollinger ─────────────────────────────────────────

export function calculerBollinger(
  clotures: number[],
  periode = 20,
  ecartType = 2
): { haut?: number; milieu?: number; bas?: number } {
  if (clotures.length < periode) return {};

  const tranche = clotures.slice(-periode);
  const milieu = tranche.reduce((s, v) => s + v, 0) / periode;
  const variance = tranche.reduce((s, v) => s + Math.pow(v - milieu, 2), 0) / periode;
  const std = Math.sqrt(variance);

  return {
    haut: milieu + ecartType * std,
    milieu,
    bas: milieu - ecartType * std,
  };
}

// ─── Calcul complet des indicateurs ─────────────────────────────

export function calculerIndicateurs(historique: DonneesHistoriques[]): IndicateursTechniques {
  if (historique.length === 0) return {};

  const clotures = historique.map((h) => h.cloture);
  const rsi = calculerRSI(clotures);
  const mm20 = moyenneMobileSimple(clotures, 20);
  const mm50 = moyenneMobileSimple(clotures, 50);
  const mm200 = moyenneMobileSimple(clotures, 200);
  const macd = calculerMACD(clotures);
  const bollinger = calculerBollinger(clotures);
  const prixActuel = clotures[clotures.length - 1];

  // Déterminer la tendance
  let tendance: IndicateursTechniques['tendance'] = 'neutre';
  if (mm20 && mm50) {
    if (prixActuel > mm20 && mm20 > mm50) tendance = 'haussiere';
    else if (prixActuel < mm20 && mm20 < mm50) tendance = 'baissiere';
    else tendance = 'laterale';
  }

  // Force du signal (0-100)
  let forceSignal = 50;
  if (rsi) {
    if (rsi > 70 || rsi < 30) forceSignal = 75;
    if (rsi > 80 || rsi < 20) forceSignal = 90;
  }

  return {
    rsi14: rsi,
    mm20,
    mm50,
    mm200,
    macdLigne: macd.ligne,
    macdSignal: macd.signal,
    macdHistogramme: macd.histogramme,
    bbHaut: bollinger.haut,
    bbMilieu: bollinger.milieu,
    bbBas: bollinger.bas,
    tendance,
    forceSignal,
  };
}

// ─── Formater les indicateurs pour les agents ────────────────────

export function formaterIndicateursPourAgent(
  symbole: string,
  indicateurs: IndicateursTechniques,
  prixActuel: number
): string {
  const lignes = [
    `Symbole : ${symbole}`,
    `Prix actuel : ${prixActuel.toFixed(4)}`,
    '',
    '=== INDICATEURS TECHNIQUES ===',
  ];

  if (indicateurs.rsi14) {
    const etatRSI = indicateurs.rsi14 > 70 ? '🔴 SURACHETÉ' : indicateurs.rsi14 < 30 ? '🟢 SURVENDU' : '🟡 NEUTRE';
    lignes.push(`RSI(14) : ${indicateurs.rsi14.toFixed(2)} ${etatRSI}`);
  }

  if (indicateurs.mm20) lignes.push(`MM20 : ${indicateurs.mm20.toFixed(4)} (prix ${prixActuel > indicateurs.mm20 ? 'AU-DESSUS' : 'EN-DESSOUS'})`);
  if (indicateurs.mm50) lignes.push(`MM50 : ${indicateurs.mm50.toFixed(4)}`);
  if (indicateurs.mm200) lignes.push(`MM200 : ${indicateurs.mm200.toFixed(4)}`);

  if (indicateurs.macdLigne !== undefined) {
    lignes.push(`MACD : ${indicateurs.macdLigne.toFixed(4)} | Signal : ${indicateurs.macdSignal?.toFixed(4)}`);
    lignes.push(`Histogramme MACD : ${indicateurs.macdHistogramme?.toFixed(4)} ${(indicateurs.macdHistogramme ?? 0) > 0 ? '(haussier)' : '(baissier)'}`);
  }

  if (indicateurs.bbHaut) {
    lignes.push(`Bollinger : Haut ${indicateurs.bbHaut.toFixed(4)} | Milieu ${indicateurs.bbMilieu?.toFixed(4)} | Bas ${indicateurs.bbBas?.toFixed(4)}`);
  }

  lignes.push(`Tendance : ${indicateurs.tendance?.toUpperCase() ?? 'INCONNUE'}`);
  lignes.push(`Force signal : ${indicateurs.forceSignal ?? 0}/100`);

  return lignes.join('\n');
}
