// Règles de gestion du risque pour le paper trading
import type { Position, Portefeuille, OrdreExecution, TypeMarche } from '@/types';

// ─── Constantes de risque ────────────────────────────────────────

export const REGLES_RISQUE = {
  MAX_RISQUE_PAR_TRADE_PCT: 0.01,    // 1% max par trade
  MAX_POSITIONS_PAR_MARCHE: 3,       // 3 positions max par marché
  MAX_DRAWDOWN_PCT: 0.10,            // 10% drawdown → arrêt automatique
  MIN_RATIO_RISQUE_RECOMPENSE: 1.5,  // Ratio R/R minimum
  MAX_POSITIONS_TOTAL: 10,           // 10 positions ouvertes max
} as const;

// ─── Validation d'un ordre ─────────────────────────────────────

export interface ResultatValidation {
  approuve: boolean;
  raison: string;
  tailleRecommandee?: number;
  risqueCalcule?: number;
}

export function validerOrdre(
  ordre: OrdreExecution,
  portefeuille: Portefeuille,
  positionsOuvertes: Position[]
): ResultatValidation {
  const capitalActuel = portefeuille.capitalActuel;

  // Vérifier le drawdown
  const drawdownPct = calculerDrawdown(portefeuille);
  if (drawdownPct >= REGLES_RISQUE.MAX_DRAWDOWN_PCT) {
    return {
      approuve: false,
      raison: `Drawdown de ${(drawdownPct * 100).toFixed(1)}% atteint — trading suspendu automatiquement`,
    };
  }

  // Vérifier le nombre total de positions
  if (positionsOuvertes.length >= REGLES_RISQUE.MAX_POSITIONS_TOTAL) {
    return {
      approuve: false,
      raison: `Nombre maximum de positions atteint (${REGLES_RISQUE.MAX_POSITIONS_TOTAL})`,
    };
  }

  // Vérifier le nombre de positions par marché
  const positionsMarche = positionsOuvertes.filter((p) => p.marche === ordre.marche).length;
  if (positionsMarche >= REGLES_RISQUE.MAX_POSITIONS_PAR_MARCHE) {
    return {
      approuve: false,
      raison: `Maximum de ${REGLES_RISQUE.MAX_POSITIONS_PAR_MARCHE} positions atteint sur le marché ${ordre.marche}`,
    };
  }

  // Vérifier la présence d'un stop-loss
  if (!ordre.stopLoss) {
    return {
      approuve: false,
      raison: 'Stop-loss obligatoire — ordre refusé',
    };
  }

  // Calculer le risque réel
  const risqueParUnite = Math.abs(ordre.prixEntree - ordre.stopLoss);
  const risqueTotal = risqueParUnite * ordre.taille;
  const risquePct = risqueTotal / capitalActuel;

  if (risquePct > REGLES_RISQUE.MAX_RISQUE_PAR_TRADE_PCT) {
    // Calculer la taille recommandée
    const tailleMax = (capitalActuel * REGLES_RISQUE.MAX_RISQUE_PAR_TRADE_PCT) / risqueParUnite;
    return {
      approuve: false,
      raison: `Risque de ${(risquePct * 100).toFixed(2)}% dépasse le maximum autorisé de 1%`,
      tailleRecommandee: Math.floor(tailleMax * 100) / 100,
      risqueCalcule: risquePct,
    };
  }

  // Vérifier le ratio risque/récompense si take-profit défini
  if (ordre.takeProfit) {
    const potentielGain = Math.abs(ordre.takeProfit - ordre.prixEntree) * ordre.taille;
    const ratioRR = potentielGain / risqueTotal;
    if (ratioRR < REGLES_RISQUE.MIN_RATIO_RISQUE_RECOMPENSE) {
      return {
        approuve: false,
        raison: `Ratio risque/récompense de ${ratioRR.toFixed(2)} inférieur au minimum requis (${REGLES_RISQUE.MIN_RATIO_RISQUE_RECOMPENSE})`,
        risqueCalcule: risquePct,
      };
    }
  }

  return {
    approuve: true,
    raison: `Ordre validé — risque de ${(risquePct * 100).toFixed(3)}% sur le capital`,
    risqueCalcule: risquePct,
  };
}

// ─── Calcul de la taille de position optimale ────────────────

export function calculerTaillePosition(
  capitalActuel: number,
  prixEntree: number,
  stopLoss: number,
  risquePct = REGLES_RISQUE.MAX_RISQUE_PAR_TRADE_PCT
): number {
  const risqueParUnite = Math.abs(prixEntree - stopLoss);
  if (risqueParUnite === 0) return 0;

  const montantARisquer = capitalActuel * risquePct;
  const taille = montantARisquer / risqueParUnite;

  // Arrondir selon le marché
  return Math.floor(taille * 100) / 100;
}

// ─── Calcul du drawdown ──────────────────────────────────────

export function calculerDrawdown(portefeuille: Portefeuille): number {
  if (portefeuille.capitalInitial === 0) return 0;
  const perte = portefeuille.capitalInitial - portefeuille.capitalActuel;
  return Math.max(0, perte / portefeuille.capitalInitial);
}

// ─── Vérification de l'arrêt automatique ────────────────────

export function doitArreterTrading(portefeuille: Portefeuille): boolean {
  return calculerDrawdown(portefeuille) >= REGLES_RISQUE.MAX_DRAWDOWN_PCT;
}

// ─── Résumé du risque courant ────────────────────────────────

export interface ResumeRisque {
  drawdownPct: number;
  nbPositionsOuvertes: number;
  capitalARisque: number;
  capitalARisquePct: number;
  tradingActif: boolean;
  positionsParMarche: Record<TypeMarche, number>;
}

export function calculerResumeRisque(
  portefeuille: Portefeuille,
  positionsOuvertes: Position[]
): ResumeRisque {
  const drawdownPct = calculerDrawdown(portefeuille);

  const positionsParMarche = positionsOuvertes.reduce(
    (acc, pos) => {
      acc[pos.marche] = (acc[pos.marche] ?? 0) + 1;
      return acc;
    },
    { forex: 0, actions: 0, crypto: 0 } as Record<TypeMarche, number>
  );

  // Calculer le capital total à risque (basé sur les stop-loss)
  const capitalARisque = positionsOuvertes.reduce((total, pos) => {
    if (!pos.stopLoss) return total;
    const risqueParUnite = Math.abs(pos.prixEntree - pos.stopLoss);
    return total + risqueParUnite * pos.taille;
  }, 0);

  return {
    drawdownPct,
    nbPositionsOuvertes: positionsOuvertes.length,
    capitalARisque,
    capitalARisquePct: capitalARisque / portefeuille.capitalActuel,
    tradingActif: drawdownPct < REGLES_RISQUE.MAX_DRAWDOWN_PCT && portefeuille.statut === 'actif',
    positionsParMarche,
  };
}
