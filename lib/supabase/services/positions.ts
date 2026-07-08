// Service Supabase — Gestion des positions (paper trading)
import { obtenirClientServeur } from '../client';
import type { Position, OrdreExecution, TypeMarche } from '@/types';

// Lister les positions d'un portefeuille
export async function listerPositions(
  portefeuilleId: string,
  statut?: 'ouverte' | 'fermee' | 'annulee'
): Promise<Position[]> {
  const supabase = obtenirClientServeur();
  let requete = supabase
    .from('positions')
    .select('*')
    .eq('portefeuille_id', portefeuilleId)
    .order('ouvert_le', { ascending: false });

  if (statut) {
    requete = requete.eq('statut', statut);
  }

  const { data, error } = await requete;
  if (error) throw new Error(`Erreur lecture positions : ${error.message}`);
  return (data ?? []).map(dbVersPosition);
}

// Ouvrir une nouvelle position simulée
export async function ouvrirPosition(
  portefeuilleId: string,
  ordre: OrdreExecution,
  cycleId?: string
): Promise<Position> {
  const supabase = obtenirClientServeur();

  const { data, error } = await supabase
    .from('positions')
    .insert({
      portefeuille_id: portefeuilleId,
      cycle_id: cycleId,
      symbole: ordre.symbole,
      marche: ordre.marche,
      direction: ordre.direction,
      taille: ordre.taille,
      prix_entree: ordre.prixEntree,
      stop_loss: ordre.stopLoss,
      take_profit: ordre.takeProfit,
      statut: 'ouverte',
      raisonnement: ordre.raisonnement,
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur ouverture position : ${error.message}`);
  return dbVersPosition(data);
}

// Fermer une position simulée
export async function fermerPosition(
  positionId: string,
  prixSortie: number
): Promise<Position> {
  const supabase = obtenirClientServeur();

  // Récupérer la position actuelle
  const { data: posActuelle } = await supabase
    .from('positions')
    .select('*')
    .eq('id', positionId)
    .single();

  if (!posActuelle) throw new Error('Position introuvable');

  // Calculer le PnL
  const pos = dbVersPosition(posActuelle);
  const pnl = calculerPnL(pos, prixSortie);

  const { data, error } = await supabase
    .from('positions')
    .update({
      prix_sortie: prixSortie,
      pnl,
      statut: 'fermee',
      ferme_le: new Date().toISOString(),
    })
    .eq('id', positionId)
    .select()
    .single();

  if (error) throw new Error(`Erreur fermeture position : ${error.message}`);

  // Mettre à jour le capital du portefeuille
  const { data: portefeuille } = await supabase
    .from('portefeuilles')
    .select('capital_actuel')
    .eq('id', pos.portefeuilleId)
    .single();

  if (portefeuille) {
    const nouveauCapital = Number(portefeuille.capital_actuel) + pnl;
    await supabase
      .from('portefeuilles')
      .update({ capital_actuel: nouveauCapital })
      .eq('id', pos.portefeuilleId);
  }

  return dbVersPosition(data);
}

// Vérifier les stop-loss et take-profit
export async function verifierStopLossTakeProfit(
  portefeuilleId: string,
  prixActuels: Record<string, number>
): Promise<{ fermees: Position[]; nbFermees: number }> {
  const positions = await listerPositions(portefeuilleId, 'ouverte');
  const fermees: Position[] = [];

  for (const pos of positions) {
    const prixActuel = prixActuels[pos.symbole];
    if (!prixActuel) continue;

    let doitFermer = false;

    if (pos.direction === 'achat') {
      if (pos.stopLoss && prixActuel <= pos.stopLoss) doitFermer = true;
      if (pos.takeProfit && prixActuel >= pos.takeProfit) doitFermer = true;
    } else {
      if (pos.stopLoss && prixActuel >= pos.stopLoss) doitFermer = true;
      if (pos.takeProfit && prixActuel <= pos.takeProfit) doitFermer = true;
    }

    if (doitFermer) {
      const posFermee = await fermerPosition(pos.id, prixActuel);
      fermees.push(posFermee);
    }
  }

  return { fermees, nbFermees: fermees.length };
}

// Calculer le PnL d'une position
export function calculerPnL(pos: Position, prixActuel: number): number {
  const diff = pos.direction === 'achat'
    ? prixActuel - pos.prixEntree
    : pos.prixEntree - prixActuel;

  // Spread simulé selon le marché
  const spread = obtenirSpread(pos.marche, pos.prixEntree);

  return (diff - spread) * pos.taille;
}

// Spread simulé réaliste par marché
function obtenirSpread(marche: TypeMarche, prix: number): number {
  switch (marche) {
    case 'forex': return 0.0001;      // 1 pip EUR/USD
    case 'actions': return prix * 0.0005; // 0.05% pour les actions
    case 'crypto': return prix * 0.001;   // 0.1% pour les cryptos
    default: return 0;
  }
}

// Compter les positions ouvertes par marché
export async function compterPositionsParMarche(
  portefeuilleId: string
): Promise<Record<TypeMarche, number>> {
  const positions = await listerPositions(portefeuilleId, 'ouverte');
  return positions.reduce(
    (acc, pos) => {
      acc[pos.marche] = (acc[pos.marche] ?? 0) + 1;
      return acc;
    },
    { forex: 0, actions: 0, crypto: 0 } as Record<TypeMarche, number>
  );
}

// ─── Mapping DB → Type ──────────────────────────────────────────

function dbVersPosition(db: Record<string, unknown>): Position {
  return {
    id: db.id as string,
    portefeuilleId: db.portefeuille_id as string,
    cycleId: db.cycle_id as string | undefined,
    symbole: db.symbole as string,
    marche: db.marche as TypeMarche,
    direction: db.direction as 'achat' | 'vente',
    taille: Number(db.taille),
    prixEntree: Number(db.prix_entree),
    stopLoss: db.stop_loss ? Number(db.stop_loss) : undefined,
    takeProfit: db.take_profit ? Number(db.take_profit) : undefined,
    prixSortie: db.prix_sortie ? Number(db.prix_sortie) : undefined,
    pnl: db.pnl ? Number(db.pnl) : undefined,
    statut: db.statut as Position['statut'],
    ouvert_le: db.ouvert_le as string,
    ferme_le: db.ferme_le as string | undefined,
    raisonnement: db.raisonnement as string | undefined,
  };
}
