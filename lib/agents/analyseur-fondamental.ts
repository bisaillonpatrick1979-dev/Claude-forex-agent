// Agent : Analyste Fondamental
import type { RequeteIA, ReponseIA, Cotation } from '@/types';
import { obtenirFournisseur } from '@/lib/ia/fournisseurs/registre';
import { obtenirConfigAgent } from '@/lib/supabase/services/config-agents';
import { PROMPTS_SYSTEME } from './prompts';

export interface AnalyseFondamentale {
  biais: 'haussier' | 'baissier' | 'neutre';
  sentiment: 'risk-on' | 'risk-off' | 'neutre';
  facteursPrincipaux: string[];
  raisonnement: string;
}

export async function analyserFondamentalement(params: {
  symbole: string;
  marche: string;
  cotation: Cotation;
}): Promise<{ analyse: AnalyseFondamentale; reponse: ReponseIA }> {
  const config = await obtenirConfigAgent('analyseur_fondamental');
  const fournisseur = obtenirFournisseur(config?.fournisseur ?? 'mock');

  const prompt = `Analyse fondamentale pour ${params.symbole} (${params.marche})

Prix actuel : ${params.cotation.prix.toFixed(4)}
Variation journalière : ${params.cotation.variationPct.toFixed(2)}%
Volume : ${params.cotation.volumeJour?.toLocaleString('fr-CA') ?? 'N/A'}
Haut 24h : ${params.cotation.high24h?.toFixed(4) ?? 'N/A'}
Bas 24h : ${params.cotation.low24h?.toFixed(4) ?? 'N/A'}

Analyse le contexte macroéconomique et donne un biais directionnel (HAUSSIER, BAISSIER ou NEUTRE).
Identifie les facteurs clés qui influencent cet instrument.`;

  const requete: RequeteIA = {
    agent: 'analyseur_fondamental',
    systemPrompt: PROMPTS_SYSTEME.analyseur_fondamental,
    prompt,
    contexte: {
      symbole: params.symbole,
      prix: params.cotation.prix.toFixed(4),
    },
  };

  const reponse = await fournisseur.generer(requete, config?.modele);

  const contenu = reponse.contenu.toLowerCase();
  let biais: AnalyseFondamentale['biais'] = 'neutre';
  if (contenu.includes('haussier') || contenu.includes('positif')) biais = 'haussier';
  else if (contenu.includes('baissier') || contenu.includes('négatif')) biais = 'baissier';

  let sentiment: AnalyseFondamentale['sentiment'] = 'neutre';
  if (contenu.includes('risk-on') || contenu.includes('appétit pour le risque')) sentiment = 'risk-on';
  else if (contenu.includes('risk-off') || contenu.includes('aversion au risque')) sentiment = 'risk-off';

  return {
    analyse: {
      biais,
      sentiment,
      facteursPrincipaux: extraireFacteurs(reponse.contenu),
      raisonnement: reponse.contenu.substring(0, 500),
    },
    reponse,
  };
}

function extraireFacteurs(contenu: string): string[] {
  const lignes = contenu.split('\n').filter((l) => l.trim().startsWith('-'));
  return lignes.slice(0, 3).map((l) => l.replace(/^-\s*/, '').trim());
}
