// Agent : Analyste Technique
import type { RequeteIA, ReponseIA, DonneesHistoriques, IndicateursTechniques } from '@/types';
import { obtenirFournisseur } from '@/lib/ia/fournisseurs/registre';
import { obtenirConfigAgent } from '@/lib/supabase/services/config-agents';
import { formaterIndicateursPourAgent } from '@/lib/cotations/indicateurs';
import { PROMPTS_SYSTEME } from './prompts';

export interface AnalyseTechnique {
  signal: 'achat' | 'vente' | 'neutre';
  confiance: number;
  tendance: string;
  niveauxCles: { support: number; resistance: number };
  prixEntree?: number;
  stopLoss?: number;
  takeProfit?: number;
  raisonnement: string;
}

export async function analyserTechniquement(params: {
  leconsPrecedentes?: string;
  symbole: string;
  prixActuel: number;
  indicateurs: IndicateursTechniques;
  historique: DonneesHistoriques[];
}): Promise<{ analyse: AnalyseTechnique; reponse: ReponseIA }> {
  const config = await obtenirConfigAgent('analyseur_technique');
  const fournisseur = obtenirFournisseur(config?.fournisseur ?? 'mock');

  const contexteTechnique = formaterIndicateursPourAgent(
    params.symbole,
    params.indicateurs,
    params.prixActuel
  );

  // Ajouter les données OHLC récentes
  const dernieresBougies = params.historique.slice(-5).map((h) =>
    `${h.date} O:${h.ouverture.toFixed(4)} H:${h.haut.toFixed(4)} L:${h.bas.toFixed(4)} C:${h.cloture.toFixed(4)}`
  ).join('\n');

  const prompt = `${contexteTechnique}

=== DONNÉES OHLC RÉCENTES ===
${dernieresBougies}

Effectue une analyse technique complète et donne une recommandation claire (ACHAT, VENTE ou NEUTRE).
Inclus les niveaux clés : support, résistance, stop-loss suggéré et objectif de prix.`;

  const systemPrompt = PROMPTS_SYSTEME.analyseur_technique + (params.leconsPrecedentes ?? '');

  const requete: RequeteIA = {
    agent: 'analyseur_technique',
    systemPrompt,
    prompt,
    contexte: {
      symbole: params.symbole,
      prix: params.prixActuel.toFixed(4),
    },
  };

  const reponse = await fournisseur.generer(requete, config?.modele);

  // Extraire les informations clés de la réponse textuelle
  const contenu = reponse.contenu.toLowerCase();
  let signal: AnalyseTechnique['signal'] = 'neutre';
  if (contenu.includes('achat') && !contenu.includes('pas d\'achat')) signal = 'achat';
  else if (contenu.includes('vente') && !contenu.includes('pas de vente')) signal = 'vente';

  const confiance = extraireConfiance(reponse.contenu);

  // Calcul des niveaux basé sur les indicateurs
  const spread = params.prixActuel * 0.002;
  const support = params.indicateurs.bbBas ?? params.prixActuel * 0.99;
  const resistance = params.indicateurs.bbHaut ?? params.prixActuel * 1.01;
  const stopLoss = signal === 'achat' ? support - spread : resistance + spread;
  const takeProfit = signal === 'achat' ? resistance : support;

  const analyse: AnalyseTechnique = {
    signal,
    confiance,
    tendance: params.indicateurs.tendance ?? 'neutre',
    niveauxCles: { support, resistance },
    prixEntree: params.prixActuel,
    stopLoss,
    takeProfit,
    raisonnement: reponse.contenu.substring(0, 500),
  };

  return { analyse, reponse };
}

function extraireConfiance(contenu: string): number {
  const match = contenu.match(/(\d{1,3})\s*%/);
  if (match) {
    const val = parseInt(match[1]);
    if (val >= 0 && val <= 100) return val;
  }
  // Confiance par défaut basée sur les mots-clés
  if (contenu.includes('fort') || contenu.includes('solide')) return 70;
  if (contenu.includes('faible') || contenu.includes('incertain')) return 35;
  return 55;
}
