// Service Supabase — Mémoire des leçons apprises par les agents
import { obtenirClientServeur } from '../client';
import type { NomAgent } from '@/types';

export interface Lecon {
  id: string;
  portefeuilleId: string;
  agent: NomAgent;
  symbole?: string;
  lecon: string;
  contexte?: Record<string, unknown>;
  typeErreur?: string;
  positionId?: string;
  cree_le: string;
}

// Enregistrer une nouvelle leçon
export async function enregistrerLecon(params: {
  portefeuilleId: string;
  agent: NomAgent;
  lecon: string;
  symbole?: string;
  contexte?: Record<string, unknown>;
  typeErreur?: string;
  positionId?: string;
}): Promise<void> {
  const supabase = obtenirClientServeur();
  await supabase.from('lecons_agents').insert({
    portefeuille_id: params.portefeuilleId,
    agent: params.agent,
    symbole: params.symbole,
    lecon: params.lecon,
    contexte: params.contexte ?? {},
    type_erreur: params.typeErreur,
    position_id: params.positionId,
  });
}

// Obtenir les N dernières leçons d'un agent
export async function obtenirLecons(
  portefeuilleId: string,
  agent: NomAgent,
  limite = 5
): Promise<Lecon[]> {
  const supabase = obtenirClientServeur();
  const { data, error } = await supabase
    .from('lecons_agents')
    .select('*')
    .eq('portefeuille_id', portefeuilleId)
    .eq('agent', agent)
    .order('cree_le', { ascending: false })
    .limit(limite);

  if (error) return [];
  return (data ?? []).map(dbVersLecon);
}

// Obtenir toutes les leçons d'un portefeuille (pour l'affichage UI)
export async function listerToutesLecons(
  portefeuilleId: string,
  limite = 50
): Promise<Lecon[]> {
  const supabase = obtenirClientServeur();
  const { data } = await supabase
    .from('lecons_agents')
    .select('*')
    .eq('portefeuille_id', portefeuilleId)
    .order('cree_le', { ascending: false })
    .limit(limite);

  return (data ?? []).map(dbVersLecon);
}

// Vérifier si une position a déjà une leçon associée
export async function leconExistePourPosition(positionId: string): Promise<boolean> {
  const supabase = obtenirClientServeur();
  const { count } = await supabase
    .from('lecons_agents')
    .select('id', { count: 'exact' })
    .eq('position_id', positionId);

  return (count ?? 0) > 0;
}

function dbVersLecon(db: Record<string, unknown>): Lecon {
  return {
    id: db.id as string,
    portefeuilleId: db.portefeuille_id as string,
    agent: db.agent as NomAgent,
    symbole: db.symbole as string | undefined,
    lecon: db.lecon as string,
    contexte: db.contexte as Record<string, unknown> | undefined,
    typeErreur: db.type_erreur as string | undefined,
    positionId: db.position_id as string | undefined,
    cree_le: db.cree_le as string,
  };
}
