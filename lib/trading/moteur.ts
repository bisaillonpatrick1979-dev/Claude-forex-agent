// Moteur de paper trading — orchestration des positions
import { obtenirClientServeur } from '@/lib/supabase/client';
import {
  listerPositions,
  ouvrirPosition,
  fermerPosition,
  verifierStopLossTakeProfit,
  calculerPnL,
} from '@/lib/supabase/services/positions';
import {
  obtenirPortefeuille,
  mettreAJourCapital,
  mettreAJourStatut,
  calculerValeurPortefeuille,
} from '@/lib/supabase/services/portefeuilles';
import {
  validerOrdre,
  doitArreterTrading,
  calculerResumeRisque,
  type ResumeRisque,
} from './risque';
import type { OrdreExecution, Position, Portefeuille } from '@/types';

// ─── Résultat d'exécution d'un ordre ─────────────────────────

export interface ResultatExecution {
  succes: boolean;
  position?: Position;
  message: string;
  risquePct?: number;
}

// ─── Exécuter un ordre (paper trading) ───────────────────────

export async function executerOrdre(
  portefeuilleId: string,
  ordre: OrdreExecution,
  cycleId?: string
): Promise<ResultatExecution> {
  // Charger les données nécessaires
  const [portefeuille, positionsOuvertes] = await Promise.all([
    obtenirPortefeuille(portefeuilleId),
    listerPositions(portefeuilleId, 'ouverte'),
  ]);

  if (!portefeuille) {
    return { succes: false, message: 'Portefeuille introuvable' };
  }

  if (portefeuille.statut !== 'actif') {
    return { succes: false, message: `Portefeuille ${portefeuille.statut} — trading suspendu` };
  }

  // Vérifier les règles de risque
  const validation = validerOrdre(ordre, portefeuille, positionsOuvertes);
  if (!validation.approuve) {
    return {
      succes: false,
      message: validation.raison,
      risquePct: validation.risqueCalcule,
    };
  }

  // Vérifier l'arrêt automatique par drawdown
  if (doitArreterTrading(portefeuille)) {
    await mettreAJourStatut(portefeuilleId, 'suspendu');
    return {
      succes: false,
      message: 'Trading suspendu automatiquement — drawdown de 10% atteint',
    };
  }

  // Ouvrir la position
  const position = await ouvrirPosition(portefeuilleId, ordre, cycleId);

  return {
    succes: true,
    position,
    message: `Position ${ordre.direction} ouverte sur ${ordre.symbole} @ ${ordre.prixEntree}`,
    risquePct: validation.risqueCalcule,
  };
}

// ─── Mise à jour des prix et vérification des SL/TP ─────────

export async function mettreAJourPrix(
  portefeuilleId: string,
  prixActuels: Record<string, number>
): Promise<{ fermees: Position[]; nbFermees: number }> {
  const resultat = await verifierStopLossTakeProfit(portefeuilleId, prixActuels);

  // Vérifier le drawdown après les fermetures
  const portefeuille = await obtenirPortefeuille(portefeuilleId);
  if (portefeuille && doitArreterTrading(portefeuille)) {
    await mettreAJourStatut(portefeuilleId, 'suspendu');
  }

  return resultat;
}

// ─── Calculer la valeur de marché du portefeuille ───────────

export async function calculerValeurMarche(
  portefeuilleId: string,
  prixActuels: Record<string, number>
): Promise<{
  capitalActuel: number;
  valeurPositions: number;
  valeurTotale: number;
  pnlNonRealise: number;
  pnlTotal: number;
}> {
  const [portefeuille, positionsOuvertes] = await Promise.all([
    obtenirPortefeuille(portefeuilleId),
    listerPositions(portefeuilleId, 'ouverte'),
  ]);

  if (!portefeuille) {
    return { capitalActuel: 0, valeurPositions: 0, valeurTotale: 0, pnlNonRealise: 0, pnlTotal: 0 };
  }

  // PnL non réalisé de toutes les positions ouvertes
  const pnlNonRealise = positionsOuvertes.reduce((total, pos) => {
    const prixActuel = prixActuels[pos.symbole];
    if (!prixActuel) return total;
    return total + calculerPnL(pos, prixActuel);
  }, 0);

  const valeurPositions = positionsOuvertes.reduce((total, pos) => {
    return total + pos.prixEntree * pos.taille;
  }, 0);

  const pnlRealise = await calculerValeurPortefeuille(portefeuilleId);

  return {
    capitalActuel: portefeuille.capitalActuel,
    valeurPositions,
    valeurTotale: portefeuille.capitalActuel + pnlNonRealise,
    pnlNonRealise,
    pnlTotal: pnlRealise.pnlTotal,
  };
}

// ─── Résumé complet du portefeuille ─────────────────────────

export async function obtenirEtatPortefeuille(
  portefeuilleId: string,
  prixActuels: Record<string, number>
): Promise<{
  portefeuille: Portefeuille | null;
  risque: ResumeRisque | null;
  valeurMarche: Awaited<ReturnType<typeof calculerValeurMarche>>;
}> {
  const [portefeuille, positionsOuvertes] = await Promise.all([
    obtenirPortefeuille(portefeuilleId),
    listerPositions(portefeuilleId, 'ouverte'),
  ]);

  if (!portefeuille) {
    return {
      portefeuille: null,
      risque: null,
      valeurMarche: { capitalActuel: 0, valeurPositions: 0, valeurTotale: 0, pnlNonRealise: 0, pnlTotal: 0 },
    };
  }

  const [risque, valeurMarche] = await Promise.all([
    Promise.resolve(calculerResumeRisque(portefeuille, positionsOuvertes)),
    calculerValeurMarche(portefeuilleId, prixActuels),
  ]);

  return { portefeuille, risque, valeurMarche };
}

// ─── Fermer toutes les positions d'un portefeuille ──────────

export async function fermerToutesPositions(
  portefeuilleId: string,
  prixActuels: Record<string, number>
): Promise<{ nbFermees: number; pnlTotal: number }> {
  const positions = await listerPositions(portefeuilleId, 'ouverte');
  let pnlTotal = 0;
  let nbFermees = 0;

  for (const pos of positions) {
    const prixActuel = prixActuels[pos.symbole];
    if (!prixActuel) continue;

    const posFermee = await fermerPosition(pos.id, prixActuel);
    pnlTotal += posFermee.pnl ?? 0;
    nbFermees++;
  }

  return { nbFermees, pnlTotal };
}
