// Service Supabase — Cycles de décision et messages des agents
import { obtenirClientServeur } from '../client';
import type { CycleDecision, MessageAgentDB, DecisionFinale, NomAgent, NomFournisseur } from '@/types';

// Créer un nouveau cycle de décision
export async function creerCycle(
  portefeuilleId: string,
  declenchePar: 'manuel' | 'cron' | 'automatique' = 'manuel'
): Promise<CycleDecision> {
  const supabase = obtenirClientServeur();
  const { data, error } = await supabase
    .from('cycles_decision')
    .insert({
      portefeuille_id: portefeuilleId,
      declenche_par: declenchePar,
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur création cycle : ${error.message}`);
  return dbVersCycle(data);
}

// Finaliser un cycle avec la décision du PDG
export async function finaliserCycle(
  cycleId: string,
  decisionFinale: DecisionFinale,
  nbTradesExecutes: number,
  durationMs: number
): Promise<void> {
  const supabase = obtenirClientServeur();
  const { error } = await supabase
    .from('cycles_decision')
    .update({
      decision_finale: decisionFinale,
      nb_trades_executes: nbTradesExecutes,
      duree_ms: durationMs,
    })
    .eq('id', cycleId);

  if (error) throw new Error(`Erreur finalisation cycle : ${error.message}`);
}

// Ajouter un message d'agent
export async function ajouterMessage(params: {
  cycleId: string;
  agent: NomAgent;
  roleAgent: string;
  contenu: string;
  fournisseur?: NomFournisseur;
  modele?: string;
}): Promise<MessageAgentDB> {
  const supabase = obtenirClientServeur();
  const { data, error } = await supabase
    .from('messages_agents')
    .insert({
      cycle_id: params.cycleId,
      agent: params.agent,
      role_agent: params.roleAgent,
      contenu: params.contenu,
      fournisseur: params.fournisseur,
      modele: params.modele,
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur ajout message : ${error.message}`);
  return dbVersMessage(data);
}

// Récupérer les cycles d'un portefeuille (paginés)
export async function listerCycles(
  portefeuilleId: string,
  limite = 20,
  page = 0
): Promise<CycleDecision[]> {
  const supabase = obtenirClientServeur();
  const { data, error } = await supabase
    .from('cycles_decision')
    .select('*')
    .eq('portefeuille_id', portefeuilleId)
    .order('execute_le', { ascending: false })
    .range(page * limite, (page + 1) * limite - 1);

  if (error) throw new Error(`Erreur lecture cycles : ${error.message}`);
  return (data ?? []).map(dbVersCycle);
}

// Récupérer un cycle avec ses messages
export async function obtenirCycleAvecMessages(
  cycleId: string
): Promise<CycleDecision | null> {
  const supabase = obtenirClientServeur();

  const [{ data: cycleData }, { data: messagesData }] = await Promise.all([
    supabase.from('cycles_decision').select('*').eq('id', cycleId).single(),
    supabase
      .from('messages_agents')
      .select('*')
      .eq('cycle_id', cycleId)
      .order('cree_le', { ascending: true }),
  ]);

  if (!cycleData) return null;

  const cycle = dbVersCycle(cycleData);
  cycle.messages = (messagesData ?? []).map(dbVersMessage);
  return cycle;
}

// Récupérer le dernier cycle d'un portefeuille
export async function obtenirDernierCycle(
  portefeuilleId: string
): Promise<CycleDecision | null> {
  const supabase = obtenirClientServeur();
  const { data } = await supabase
    .from('cycles_decision')
    .select('*')
    .eq('portefeuille_id', portefeuilleId)
    .order('execute_le', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  const cycle = dbVersCycle(data);

  // Charger aussi les messages
  const { data: messages } = await supabase
    .from('messages_agents')
    .select('*')
    .eq('cycle_id', data.id)
    .order('cree_le', { ascending: true });

  cycle.messages = (messages ?? []).map(dbVersMessage);
  return cycle;
}

// ─── Mapping DB → Type ──────────────────────────────────────────

function dbVersCycle(db: Record<string, unknown>): CycleDecision {
  return {
    id: db.id as string,
    portefeuilleId: db.portefeuille_id as string,
    declenchePar: db.declenche_par as CycleDecision['declenchePar'],
    decisionFinale: db.decision_finale as DecisionFinale | undefined,
    execute_le: db.execute_le as string,
    nbTradesExecutes: db.nb_trades_executes as number | undefined,
    messages: [],
  };
}

function dbVersMessage(db: Record<string, unknown>): MessageAgentDB {
  return {
    id: db.id as string,
    cycleId: db.cycle_id as string,
    agent: db.agent as NomAgent,
    roleAgent: db.role_agent as string,
    contenu: db.contenu as string,
    fournisseur: db.fournisseur as NomFournisseur | undefined,
    modele: db.modele as string | undefined,
    cree_le: db.cree_le as string,
  };
}
