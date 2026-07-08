// Module d'apprentissage — analyse les erreurs passées et génère des leçons
import type { Position, NomAgent } from '@/types';
import { listerPositions } from '@/lib/supabase/services/positions';
import {
  enregistrerLecon,
  leconExistePourPosition,
  obtenirLecons,
  type Lecon,
} from '@/lib/supabase/services/lecons';
import { obtenirFournisseur } from '@/lib/ia/fournisseurs/registre';
import { obtenirConfigAgent } from '@/lib/supabase/services/config-agents';
import type { RequeteIA } from '@/types';

// ─── Analyse rétrospective des trades perdants ───────────────────

export async function genererLecons(
  portefeuilleId: string
): Promise<{ nbLecons: number; lecons: string[] }> {
  // Récupérer les 20 dernières positions fermées
  const positionsFermees = await listerPositions(portefeuilleId, 'fermee');
  const perdantes = positionsFermees
    .filter((p) => (p.pnl ?? 0) < 0)
    .slice(0, 3); // Max 3 leçons par cycle pour économiser les tokens

  const leconGenerees: string[] = [];

  for (const pos of perdantes) {
    // Vérifier si une leçon existe déjà pour cette position
    const dejaAnalysee = await leconExistePourPosition(pos.id).catch(() => false);
    if (dejaAnalysee) continue;

    const lecon = await analyserErreur(pos, portefeuilleId);
    if (lecon) leconGenerees.push(lecon);
  }

  return { nbLecons: leconGenerees.length, lecons: leconGenerees };
}

// ─── Analyser une position perdante et générer une leçon ─────────

async function analyserErreur(pos: Position, portefeuilleId: string): Promise<string | null> {
  try {
    const config = await obtenirConfigAgent('analyseur_technique');
    const fournisseur = obtenirFournisseur(config?.fournisseur ?? 'mock');

    const prixEntree = pos.prixEntree.toFixed(4);
    const prixSortie = pos.prixSortie?.toFixed(4) ?? 'N/A';
    const pnl = (pos.pnl ?? 0).toFixed(2);
    const dureeHeures = pos.ferme_le
      ? ((new Date(pos.ferme_le).getTime() - new Date(pos.ouvert_le).getTime()) / 3600000).toFixed(1)
      : 'N/A';

    const prompt = `Analyse rétrospective d'une position perdante :

Instrument : ${pos.symbole} (${pos.marche})
Direction : ${pos.direction.toUpperCase()}
Prix d'entrée : ${prixEntree}
Prix de sortie (stop-loss ou TP atteint) : ${prixSortie}
Stop-loss défini : ${pos.stopLoss?.toFixed(4) ?? 'N/A'}
Take-profit défini : ${pos.takeProfit?.toFixed(4) ?? 'N/A'}
P&L réalisé : ${pnl} CAD (perte)
Durée de la position : ${dureeHeures} heures
Raisonnement initial : ${pos.raisonnement ?? 'Non documenté'}

Identifie l'erreur principale commise et formule UNE seule leçon concrète en 1-2 phrases.
La leçon doit être actionnable pour les prochains trades sur ${pos.symbole}.
Format : "Leçon : [ta leçon ici]"`;

    const requete: RequeteIA = {
      agent: 'analyseur_technique',
      systemPrompt: `Tu es l'agent rétrospectif de TradingLab IA. Tu analyses les erreurs de trading passées et tu formules des leçons claires et actionnables pour améliorer les décisions futures. Sois précis, concis, et pratique. Réponds toujours en français.`,
      prompt,
    };

    const reponse = await fournisseur.generer(requete, config?.modele);
    const contenu = reponse.contenu;

    // Extraire la leçon
    const match = contenu.match(/leçon\s*:\s*(.+?)(?:\n|$)/i);
    const leconTexte = match ? match[1].trim() : contenu.trim().substring(0, 200);

    if (!leconTexte) return null;

    // Déterminer le type d'erreur
    const typeErreur = detecterTypeErreur(contenu);

    // Enregistrer en base de données
    await enregistrerLecon({
      portefeuilleId,
      agent: 'analyseur_technique',
      lecon: leconTexte,
      symbole: pos.symbole,
      contexte: {
        direction: pos.direction,
        prixEntree: pos.prixEntree,
        prixSortie: pos.prixSortie,
        pnl: pos.pnl,
        stopLoss: pos.stopLoss,
        takeProfit: pos.takeProfit,
        marche: pos.marche,
      },
      typeErreur,
      positionId: pos.id,
    });

    return leconTexte;
  } catch (err) {
    console.error(`Erreur génération leçon pour position ${pos.id}:`, err);
    return null;
  }
}

// ─── Classifier le type d'erreur ─────────────────────────────────

function detecterTypeErreur(contenu: string): string {
  const c = contenu.toLowerCase();
  if (c.includes('rsi') && (c.includes('surachat') || c.includes('survendu'))) return 'signal_rsi_ignore';
  if (c.includes('tendance') && c.includes('contre')) return 'contre_tendance';
  if (c.includes('stop') && c.includes('trop') && c.includes('proche')) return 'stop_loss_trop_proche';
  if (c.includes('actualit') || c.includes('news') || c.includes('fondament')) return 'news_ignorees';
  if (c.includes('volatil')) return 'volatilite_sous_estimee';
  if (c.includes('ratio') || c.includes('r/r')) return 'mauvais_ratio_rr';
  if (c.includes('timing') || c.includes('trop tôt') || c.includes('trop tard')) return 'mauvais_timing';
  return 'faux_signal';
}

// ─── Formater les leçons pour injection dans les prompts ─────────

export async function obtenirLeconsPourAgent(
  portefeuilleId: string,
  agent: NomAgent,
  limite = 5
): Promise<string> {
  const lecons = await obtenirLecons(portefeuilleId, agent, limite).catch(() => [] as Lecon[]);

  if (lecons.length === 0) return '';

  const lignes = lecons.map((l) => {
    const prefixe = l.symbole ? `[${l.symbole}] ` : '';
    return `- ${prefixe}${l.lecon}`;
  });

  return `\n\n=== LEÇONS DE VOS TRADES PASSÉS (à intégrer dans votre analyse) ===\n${lignes.join('\n')}`;
}

// ─── Leçons cross-agents partagées (PDG les voit toutes) ─────────

export async function obtenirToutesLeconsPourPDG(
  portefeuilleId: string
): Promise<string> {
  const agents: NomAgent[] = [
    'analyseur_technique',
    'analyseur_fondamental',
    'gestionnaire_risque',
  ];

  const toutesLecons: Lecon[] = [];
  for (const agent of agents) {
    const lecons = await obtenirLecons(portefeuilleId, agent, 3).catch(() => [] as Lecon[]);
    toutesLecons.push(...lecons);
  }

  if (toutesLecons.length === 0) return '';

  // Trier par date décroissante
  toutesLecons.sort((a, b) => new Date(b.cree_le).getTime() - new Date(a.cree_le).getTime());

  const lignes = toutesLecons.slice(0, 7).map((l) => {
    const agent = l.agent.replace('analyseur_', '').replace('_', ' ');
    return `- [${agent}] ${l.symbole ? `${l.symbole}: ` : ''}${l.lecon}`;
  });

  return `\n\n=== MÉMOIRE COLLECTIVE DE L'ÉQUIPE (dernières leçons) ===\n${lignes.join('\n')}`;
}
