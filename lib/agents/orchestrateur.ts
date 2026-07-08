// Orchestrateur multi-agents — pipeline séquentiel complet
import type {
  RequeteIA,
  NomAgent,
  NomFournisseur,
  Cotation,
  Portefeuille,
  DonneesHistoriques,
  IndicateursTechniques,
  CycleDecision,
} from '@/types';
import { obtenirFournisseur } from '@/lib/ia/fournisseurs/registre';
import { obtenirConfigAgent } from '@/lib/supabase/services/config-agents';
import {
  creerCycle,
  ajouterMessage,
  finaliserCycle,
} from '@/lib/supabase/services/cycles';
import { enregistrerPerformance } from '@/lib/supabase/services/config-agents';
import { listerPositions } from '@/lib/supabase/services/positions';
import { calculerResumeRisque } from '@/lib/trading/risque';
import { calculerValeurMarche } from '@/lib/trading/moteur';
import { analyserTechniquement } from './analyseur-technique';
import { analyserFondamentalement } from './analyseur-fondamental';
import { evaluerRisque } from './gestionnaire-risque';
import { executerTrade } from './trader-executeur';
import { PROMPTS_SYSTEME } from './prompts';

// ─── Types du résultat d'orchestration ──────────────────────

export interface ResultatOrchestration {
  cycleId: string;
  symboleAnalyse: string;
  decisionFinale: 'achat' | 'vente' | 'attente';
  nbTradesExecutes: number;
  messages: Array<{
    agent: NomAgent;
    contenu: string;
    fournisseur: NomFournisseur;
    modele: string;
  }>;
  dureeMs: number;
  erreur?: string;
}

// ─── Pipeline d'orchestration principal ─────────────────────

export async function lancerCycle(params: {
  portefeuilleId: string;
  cotations: Cotation[];
  historiques: Record<string, DonneesHistoriques[]>;
  indicateurs: Record<string, IndicateursTechniques>;
  declenchePar?: 'manuel' | 'cron' | 'automatique';
  portefeuille: Portefeuille;
}): Promise<ResultatOrchestration> {
  const debut = Date.now();
  const { portefeuilleId, cotations, historiques, indicateurs, portefeuille } = params;

  // Créer le cycle en base de données
  const cycle = await creerCycle(portefeuilleId, params.declenchePar ?? 'automatique');
  const cycleId = cycle.id;

  const messages: ResultatOrchestration['messages'] = [];
  let nbTradesExecutes = 0;
  let decisionFinale: ResultatOrchestration['decisionFinale'] = 'attente';

  try {
    // Sélectionner l'instrument à analyser (le premier forex disponible)
    const cotation = cotations.find((c) => c.marche === 'forex') ?? cotations[0];
    if (!cotation) throw new Error('Aucune cotation disponible');

    const historique = historiques[cotation.symbole] ?? [];
    const indicateursCotation = indicateurs[cotation.symbole] ?? {};

    // Charger les positions ouvertes pour le résumé de risque
    const positionsOuvertes = await listerPositions(portefeuilleId, 'ouverte');
    const resumeRisque = calculerResumeRisque(portefeuille, positionsOuvertes);

    // ── Étape 1 : Analyse technique ─────────────────────────
    const { analyse: analyseTech, reponse: reponseTech } = await analyserTechniquement({
      symbole: cotation.symbole,
      prixActuel: cotation.prix,
      indicateurs: indicateursCotation,
      historique,
    });

    const configTech = await obtenirConfigAgent('analyseur_technique');
    await ajouterMessage({
      cycleId,
      agent: 'analyseur_technique',
      roleAgent: 'Analyste Technique',
      contenu: reponseTech.contenu,
      fournisseur: configTech?.fournisseur,
      modele: reponseTech.modele,
    });
    messages.push({
      agent: 'analyseur_technique',
      contenu: reponseTech.contenu,
      fournisseur: configTech?.fournisseur ?? 'mock',
      modele: reponseTech.modele,
    });

    // ── Étape 2 : Analyse fondamentale ─────────────────────
    const { analyse: analyseFond, reponse: reponseFond } = await analyserFondamentalement({
      symbole: cotation.symbole,
      marche: cotation.marche,
      cotation,
    });

    const configFond = await obtenirConfigAgent('analyseur_fondamental');
    await ajouterMessage({
      cycleId,
      agent: 'analyseur_fondamental',
      roleAgent: 'Analyste Fondamental',
      contenu: reponseFond.contenu,
      fournisseur: configFond?.fournisseur,
      modele: reponseFond.modele,
    });
    messages.push({
      agent: 'analyseur_fondamental',
      contenu: reponseFond.contenu,
      fournisseur: configFond?.fournisseur ?? 'mock',
      modele: reponseFond.modele,
    });

    // ── Étape 3 : Évaluation du risque ─────────────────────
    const { evaluation: evalRisque, reponse: reponseRisque } = await evaluerRisque({
      portefeuille,
      resumeRisque,
      analyseTechnique: analyseTech,
      symbole: cotation.symbole,
      marche: cotation.marche,
    });

    const configRisque = await obtenirConfigAgent('gestionnaire_risque');
    await ajouterMessage({
      cycleId,
      agent: 'gestionnaire_risque',
      roleAgent: 'Gestionnaire de Risque',
      contenu: reponseRisque.contenu,
      fournisseur: configRisque?.fournisseur,
      modele: reponseRisque.modele,
    });
    messages.push({
      agent: 'gestionnaire_risque',
      contenu: reponseRisque.contenu,
      fournisseur: configRisque?.fournisseur ?? 'mock',
      modele: reponseRisque.modele,
    });

    // ── Étape 4 : Exécution ─────────────────────────────────
    const { rapport, reponse: reponseTrader } = await executerTrade({
      portefeuilleId,
      ordre: evalRisque.approuve ? evalRisque.ordreAjuste : undefined,
      cycleId,
      prixActuel: cotation.prix,
    });

    if (rapport.ordreExecute) {
      nbTradesExecutes = 1;
      decisionFinale = analyseTech.signal === 'achat' ? 'achat' : 'vente';
    }

    const configTrader = await obtenirConfigAgent('trader_executeur');
    await ajouterMessage({
      cycleId,
      agent: 'trader_executeur',
      roleAgent: 'Trader Exécuteur',
      contenu: reponseTrader.contenu,
      fournisseur: configTrader?.fournisseur,
      modele: reponseTrader.modele,
    });
    messages.push({
      agent: 'trader_executeur',
      contenu: reponseTrader.contenu,
      fournisseur: configTrader?.fournisseur ?? 'mock',
      modele: reponseTrader.modele,
    });

    // ── Étape 5 : Décision PDG ─────────────────────────────
    const configPdg = await obtenirConfigAgent('pdg');
    const fournisseurPdg = obtenirFournisseur(configPdg?.fournisseur ?? 'mock');

    const promptPdg = `Résumé du cycle de trading — ${cotation.symbole}

ANALYSE TECHNIQUE : Signal ${analyseTech.signal.toUpperCase()} (confiance ${analyseTech.confiance}%)
ANALYSE FONDAMENTALE : Biais ${analyseFond.biais.toUpperCase()} | Sentiment ${analyseFond.sentiment}
GESTION DU RISQUE : ${evalRisque.approuve ? 'ORDRE APPROUVE' : 'ORDRE REFUSE'} — R/R:${evalRisque.ratioRR.toFixed(2)}
EXÉCUTION : ${rapport.ordreExecute ? 'TRADE EXECUTE' : 'PAS DE TRADE'}

Donne la synthèse exécutive et valide la décision prise par l'équipe.`;

    const requetePdg: RequeteIA = {
      agent: 'pdg',
      systemPrompt: PROMPTS_SYSTEME.pdg,
      prompt: promptPdg,
      contexte: {
        symbole: cotation.symbole,
        taille: evalRisque.taille.toFixed(2),
      },
    };

    const reponsePdg = await fournisseurPdg.generer(requetePdg, configPdg?.modele);

    await ajouterMessage({
      cycleId,
      agent: 'pdg',
      roleAgent: 'PDG',
      contenu: reponsePdg.contenu,
      fournisseur: configPdg?.fournisseur,
      modele: reponsePdg.modele,
    });
    messages.push({
      agent: 'pdg',
      contenu: reponsePdg.contenu,
      fournisseur: configPdg?.fournisseur ?? 'mock',
      modele: reponsePdg.modele,
    });

    // Finaliser le cycle
    const dureeMs = Date.now() - debut;
    await finaliserCycle(cycleId, decisionFinale === 'attente' ? 'attente' : decisionFinale, nbTradesExecutes, dureeMs);

    // Enregistrer les performances
    const prixActuels = Object.fromEntries(cotations.map((c) => [c.symbole, c.prix]));
    const valeurMarche = await calculerValeurMarche(portefeuilleId, prixActuels);
    const drawdown = Math.max(0, 1 - valeurMarche.valeurTotale / portefeuille.capitalInitial);

    await enregistrerPerformance({
      portefeuilleId,
      valeurTotale: valeurMarche.valeurTotale,
      pnlJour: valeurMarche.pnlNonRealise,
      drawdown,
      nbPositions: positionsOuvertes.length + nbTradesExecutes,
    });

    return {
      cycleId,
      symboleAnalyse: cotation.symbole,
      decisionFinale,
      nbTradesExecutes,
      messages,
      dureeMs,
    };
  } catch (erreur) {
    const dureeMs = Date.now() - debut;
    await finaliserCycle(cycleId, 'attente', 0, dureeMs).catch(() => {});

    return {
      cycleId,
      symboleAnalyse: cotations[0]?.symbole ?? 'N/A',
      decisionFinale: 'attente',
      nbTradesExecutes: 0,
      messages,
      dureeMs,
      erreur: erreur instanceof Error ? erreur.message : String(erreur),
    };
  }
}
