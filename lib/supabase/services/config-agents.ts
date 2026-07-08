// Service Supabase — Configuration des agents IA
import { obtenirClientServeur } from '../client';
import type { ConfigAgent, NomAgent, NomFournisseur } from '@/types';

// Récupérer la configuration de tous les agents
export async function listerConfigAgents(): Promise<ConfigAgent[]> {
  const supabase = obtenirClientServeur();
  const { data, error } = await supabase
    .from('config_agents')
    .select('*')
    .order('agent');

  if (error) throw new Error(`Erreur lecture config agents : ${error.message}`);
  return (data ?? []).map(dbVersConfig);
}

// Récupérer la config d'un agent spécifique
export async function obtenirConfigAgent(agent: NomAgent): Promise<ConfigAgent | null> {
  const supabase = obtenirClientServeur();
  const { data } = await supabase
    .from('config_agents')
    .select('*')
    .eq('agent', agent)
    .single();

  return data ? dbVersConfig(data) : null;
}

// Mettre à jour la config d'un agent
export async function mettreAJourConfigAgent(
  agent: NomAgent,
  params: { fournisseur?: NomFournisseur; modele?: string; actif?: boolean }
): Promise<ConfigAgent> {
  const supabase = obtenirClientServeur();
  const { data, error } = await supabase
    .from('config_agents')
    .update({
      ...(params.fournisseur && { fournisseur: params.fournisseur }),
      ...(params.modele && { modele: params.modele }),
      ...(params.actif !== undefined && { actif: params.actif }),
    })
    .eq('agent', agent)
    .select()
    .single();

  if (error) throw new Error(`Erreur mise à jour config agent : ${error.message}`);
  return dbVersConfig(data);
}

// Enregistrer les performances par journal
export async function enregistrerPerformance(params: {
  portefeuilleId: string;
  valeurTotale: number;
  pnlJour: number;
  drawdown: number;
  nbPositions: number;
}): Promise<void> {
  const supabase = obtenirClientServeur();
  const today = new Date().toISOString().split('T')[0];

  await supabase
    .from('journal_performance')
    .upsert(
      {
        portefeuille_id: params.portefeuilleId,
        date: today,
        valeur_totale: params.valeurTotale,
        pnl_jour: params.pnlJour,
        drawdown: params.drawdown,
        nb_positions: params.nbPositions,
      },
      { onConflict: 'portefeuille_id,date' }
    );
}

// Récupérer le journal de performance (pour le graphique)
export async function listerJournalPerformance(
  portefeuilleId: string,
  jours = 30
): Promise<{ date: string; valeur: number; pnl: number }[]> {
  const supabase = obtenirClientServeur();
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - jours);

  const { data, error } = await supabase
    .from('journal_performance')
    .select('date, valeur_totale, pnl_jour')
    .eq('portefeuille_id', portefeuilleId)
    .gte('date', dateDebut.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) return [];

  return (data ?? []).map((d) => ({
    date: d.date,
    valeur: Number(d.valeur_totale),
    pnl: Number(d.pnl_jour),
  }));
}

// ─── Mapping DB → Type ──────────────────────────────────────────

function dbVersConfig(db: Record<string, unknown>): ConfigAgent {
  return {
    id: db.id as string,
    agent: db.agent as NomAgent,
    fournisseur: db.fournisseur as NomFournisseur,
    modele: db.modele as string,
    actif: db.actif as boolean,
    mis_a_jour_le: db.mis_a_jour_le as string,
  };
}
