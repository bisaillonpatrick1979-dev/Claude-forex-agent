// Agent : Trader Exécuteur
import type { RequeteIA, ReponseIA, OrdreExecution } from '@/types';
import { obtenirFournisseur } from '@/lib/ia/fournisseurs/registre';
import { obtenirConfigAgent } from '@/lib/supabase/services/config-agents';
import { executerOrdre, type ResultatExecution } from '@/lib/trading/moteur';
import { PROMPTS_SYSTEME } from './prompts';

export interface RapportExecution {
  ordreExecute: boolean;
  resultat?: ResultatExecution;
  raisonnement: string;
}

export async function executerTrade(params: {
  portefeuilleId: string;
  ordre?: OrdreExecution;
  cycleId?: string;
  prixActuel: number;
}): Promise<{ rapport: RapportExecution; reponse: ReponseIA }> {
  const config = await obtenirConfigAgent('trader_executeur');
  const fournisseur = obtenirFournisseur(config?.fournisseur ?? 'mock');

  let resultat: ResultatExecution | undefined;
  let prompt: string;

  if (params.ordre) {
    // Tenter l'exécution
    resultat = await executerOrdre(params.portefeuilleId, params.ordre, params.cycleId);

    // Calculer le spread simulé
    let spread = 0;
    if (params.ordre.marche === 'forex') spread = 0.0001;
    else if (params.ordre.marche === 'actions') spread = params.prixActuel * 0.0005;
    else if (params.ordre.marche === 'crypto') spread = params.prixActuel * 0.001;

    const capitalUtilise = params.ordre.prixEntree * params.ordre.taille;

    prompt = `Rapport d'exécution :

Ordre : ${params.ordre.direction.toUpperCase()} ${params.ordre.symbole}
Statut : ${resultat.succes ? 'EXÉCUTÉ' : 'REJETÉ'}
Message : ${resultat.message}

Détails de la transaction :
- Prix d'entrée : ${params.ordre.prixEntree.toFixed(4)}
- Taille : ${params.ordre.taille} unités
- Stop-loss : ${params.ordre.stopLoss?.toFixed(4) ?? 'N/A'}
- Take-profit : ${params.ordre.takeProfit?.toFixed(4) ?? 'N/A'}
- Spread appliqué : ${spread.toFixed(4)}
- Capital engagé (simulé) : ${capitalUtilise.toFixed(2)} CAD

${resultat.succes ? 'Position ouverte avec succès en paper trading.' : 'Ordre non exécuté — voir le message.'}

Génère un rapport d'exécution formel pour le PDG.`;
  } else {
    prompt = `Aucun ordre à exécuter ce cycle.

Prix actuel : ${params.prixActuel.toFixed(4)}

Raisons possibles :
- Signal trop faible ou insuffisant
- Gestionnaire de risque a refusé l'ordre
- Conditions de marché défavorables

Génère un bref rapport expliquant la décision de ne pas trader.`;
  }

  const requete: RequeteIA = {
    agent: 'trader_executeur',
    systemPrompt: PROMPTS_SYSTEME.trader_executeur,
    prompt,
    contexte: {
      symbole: params.ordre?.symbole ?? 'N/A',
      direction: params.ordre?.direction ?? 'N/A',
      prix: params.prixActuel.toFixed(4),
      taille: params.ordre?.taille.toFixed(2) ?? '0',
      stop_loss: params.ordre?.stopLoss?.toFixed(4) ?? 'N/A',
      take_profit: params.ordre?.takeProfit?.toFixed(4) ?? 'N/A',
      timestamp: Date.now().toString(),
    },
  };

  const reponse = await fournisseur.generer(requete, config?.modele);

  return {
    rapport: {
      ordreExecute: resultat?.succes ?? false,
      resultat,
      raisonnement: reponse.contenu.substring(0, 500),
    },
    reponse,
  };
}
