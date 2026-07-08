// Agent : Gestionnaire de Risque
import type { RequeteIA, ReponseIA, Portefeuille, OrdreExecution } from '@/types';
import { obtenirFournisseur } from '@/lib/ia/fournisseurs/registre';
import { obtenirConfigAgent } from '@/lib/supabase/services/config-agents';
import {
  calculerTaillePosition,
  calculerDrawdown,
  REGLES_RISQUE,
  type ResumeRisque,
} from '@/lib/trading/risque';
import { PROMPTS_SYSTEME } from './prompts';
import type { AnalyseTechnique } from './analyseur-technique';

export interface EvaluationRisque {
  approuve: boolean;
  ordreAjuste?: OrdreExecution;
  taille: number;
  risquePct: number;
  ratioRR: number;
  raisonnement: string;
}

export async function evaluerRisque(params: {
  portefeuille: Portefeuille;
  resumeRisque: ResumeRisque;
  analyseTechnique: AnalyseTechnique;
  symbole: string;
  marche: 'forex' | 'actions' | 'crypto';
  leconsPrecedentes?: string;
}): Promise<{ evaluation: EvaluationRisque; reponse: ReponseIA }> {
  const config = await obtenirConfigAgent('gestionnaire_risque');
  const fournisseur = obtenirFournisseur(config?.fournisseur ?? 'mock');

  const { portefeuille, resumeRisque, analyseTechnique } = params;
  const drawdownPct = calculerDrawdown(portefeuille) * 100;

  // Calculer la taille recommandée
  const taille = calculerTaillePosition(
    portefeuille.capitalActuel,
    analyseTechnique.prixEntree ?? 0,
    analyseTechnique.stopLoss ?? 0
  );

  const risqueParUnite = Math.abs(
    (analyseTechnique.prixEntree ?? 0) - (analyseTechnique.stopLoss ?? 0)
  );
  const risquePct = risqueParUnite * taille / portefeuille.capitalActuel * 100;

  const gainParUnite = Math.abs(
    (analyseTechnique.takeProfit ?? 0) - (analyseTechnique.prixEntree ?? 0)
  );
  const ratioRR = risqueParUnite > 0 ? gainParUnite / risqueParUnite : 0;

  const prompt = `Évaluation du risque pour le trade proposé :

Symbole : ${params.symbole}
Signal : ${analyseTechnique.signal.toUpperCase()}
Prix d'entrée : ${analyseTechnique.prixEntree?.toFixed(4) ?? 'N/A'}
Stop-loss : ${analyseTechnique.stopLoss?.toFixed(4) ?? 'N/A'}
Take-profit : ${analyseTechnique.takeProfit?.toFixed(4) ?? 'N/A'}
Taille calculée : ${taille} unités
Risque en % : ${risquePct.toFixed(3)}%
Ratio R/R : ${ratioRR.toFixed(2)}

État du portefeuille :
- Capital : ${portefeuille.capitalActuel.toFixed(2)} CAD
- Drawdown : ${drawdownPct.toFixed(2)}%
- Positions ouvertes : ${resumeRisque.nbPositionsOuvertes}
- Positions sur ce marché : ${resumeRisque.positionsParMarche[params.marche]}

Valide ou rejette cet ordre selon nos règles de risque strictes.`;

  const requete: RequeteIA = {
    agent: 'gestionnaire_risque',
    systemPrompt: PROMPTS_SYSTEME.gestionnaire_risque + (params.leconsPrecedentes ?? ''),
    prompt,
    contexte: {
      capital: portefeuille.capitalActuel.toFixed(2),
      drawdown: drawdownPct.toFixed(2),
      nb_positions: resumeRisque.nbPositionsOuvertes,
      taille: taille.toFixed(2),
      risque_pct: risquePct.toFixed(3),
      stop_loss: analyseTechnique.stopLoss?.toFixed(4) ?? 'N/A',
      take_profit: analyseTechnique.takeProfit?.toFixed(4) ?? 'N/A',
      ratio_rr: ratioRR.toFixed(2),
    },
  };

  const reponse = await fournisseur.generer(requete, config?.modele);

  // Vérifications programmatiques (prioritaires sur la réponse IA)
  const approuveProgrammatiquement =
    risquePct <= REGLES_RISQUE.MAX_RISQUE_PAR_TRADE_PCT * 100 &&
    ratioRR >= REGLES_RISQUE.MIN_RATIO_RISQUE_RECOMPENSE &&
    resumeRisque.positionsParMarche[params.marche] < REGLES_RISQUE.MAX_POSITIONS_PAR_MARCHE &&
    drawdownPct < REGLES_RISQUE.MAX_DRAWDOWN_PCT * 100 &&
    analyseTechnique.signal !== 'neutre';

  let ordreAjuste: OrdreExecution | undefined;
  if (approuveProgrammatiquement && analyseTechnique.prixEntree && analyseTechnique.stopLoss) {
    ordreAjuste = {
      symbole: params.symbole,
      marche: params.marche,
      direction: analyseTechnique.signal === 'achat' ? 'achat' : 'vente',
      taille,
      prixEntree: analyseTechnique.prixEntree,
      stopLoss: analyseTechnique.stopLoss,
      takeProfit: analyseTechnique.takeProfit,
      raisonnement: `Signal ${analyseTechnique.signal} — R/R:${ratioRR.toFixed(2)} — Risque:${risquePct.toFixed(3)}%`,
    };
  }

  return {
    evaluation: {
      approuve: approuveProgrammatiquement,
      ordreAjuste,
      taille,
      risquePct,
      ratioRR,
      raisonnement: reponse.contenu.substring(0, 500),
    },
    reponse,
  };
}
