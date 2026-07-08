// Service Supabase — Gestion des portefeuilles
import { obtenirClientServeur } from '../client';
import type { Portefeuille, StatutPortefeuille } from '@/types';

// Récupérer tous les portefeuilles
export async function listerPortefeuilles(): Promise<Portefeuille[]> {
  const supabase = obtenirClientServeur();
  const { data, error } = await supabase
    .from('portefeuilles')
    .select('*')
    .order('cree_le', { ascending: true });

  if (error) throw new Error(`Erreur lecture portefeuilles : ${error.message}`);
  return (data ?? []).map(dbVersPortefeuille);
}

// Récupérer un portefeuille par ID
export async function obtenirPortefeuille(id: string): Promise<Portefeuille | null> {
  const supabase = obtenirClientServeur();
  const { data, error } = await supabase
    .from('portefeuilles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return dbVersPortefeuille(data);
}

// Créer un nouveau portefeuille
export async function creerPortefeuille(params: {
  nom: string;
  devise?: string;
  profil?: string;
  capitalInitial: number;
}): Promise<Portefeuille> {
  const supabase = obtenirClientServeur();
  const { data, error } = await supabase
    .from('portefeuilles')
    .insert({
      nom: params.nom,
      devise: params.devise ?? 'CAD',
      profil: params.profil ?? 'equilibre',
      capital_initial: params.capitalInitial,
      capital_actuel: params.capitalInitial,
      statut: 'actif',
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur création portefeuille : ${error.message}`);
  return dbVersPortefeuille(data);
}

// Mettre à jour le capital d'un portefeuille
export async function mettreAJourCapital(id: string, capitalActuel: number): Promise<void> {
  const supabase = obtenirClientServeur();
  const { error } = await supabase
    .from('portefeuilles')
    .update({ capital_actuel: capitalActuel })
    .eq('id', id);

  if (error) throw new Error(`Erreur mise à jour capital : ${error.message}`);
}

// Mettre à jour le statut d'un portefeuille
export async function mettreAJourStatut(id: string, statut: StatutPortefeuille): Promise<void> {
  const supabase = obtenirClientServeur();
  const { error } = await supabase
    .from('portefeuilles')
    .update({ statut })
    .eq('id', id);

  if (error) throw new Error(`Erreur mise à jour statut : ${error.message}`);
}

// Réinitialiser un portefeuille (capital + positions)
export async function reinitialiserPortefeuille(id: string, capitalInitial: number): Promise<void> {
  const supabase = obtenirClientServeur();

  await supabase
    .from('positions')
    .update({ statut: 'annulee', ferme_le: new Date().toISOString() })
    .eq('portefeuille_id', id)
    .eq('statut', 'ouverte');

  await supabase
    .from('portefeuilles')
    .update({ capital_actuel: capitalInitial, statut: 'actif' })
    .eq('id', id);
}

// Calculer P&L total et statistiques à partir des positions fermées
export async function calculerValeurPortefeuille(
  portefeuilleId: string
): Promise<{ pnlTotal: number; nbTrades: number; nbGagnants: number }> {
  const supabase = obtenirClientServeur();

  const { data } = await supabase
    .from('positions')
    .select('pnl')
    .eq('portefeuille_id', portefeuilleId)
    .eq('statut', 'fermee');

  const positions = data ?? [];
  const pnlTotal = positions.reduce((s, p) => s + Number(p.pnl ?? 0), 0);
  const nbTrades = positions.length;
  const nbGagnants = positions.filter((p) => Number(p.pnl ?? 0) > 0).length;

  return { pnlTotal, nbTrades, nbGagnants };
}

// ─── Mapping DB → Type ─────────────────────────────────────────────

function dbVersPortefeuille(db: Record<string, unknown>): Portefeuille {
  return {
    id: db.id as string,
    nom: db.nom as string,
    devise: (db.devise as string) ?? 'CAD',
    profil: (db.profil as string) ?? 'equilibre',
    capitalInitial: Number(db.capital_initial),
    capitalActuel: Number(db.capital_actuel),
    statut: db.statut as StatutPortefeuille,
    cree_le: db.cree_le as string,
    mis_a_jour_le: (db.mis_a_jour_le as string) ?? db.cree_le as string,
  };
}
