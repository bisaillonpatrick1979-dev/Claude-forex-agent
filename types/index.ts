// ═══════════════════════════════════════════════════════════════════
// TYPES GLOBAUX — TradingLab IA
// ═══════════════════════════════════════════════════════════════════

// ─── Marchés ─────────────────────────────────────────────────────

export type TypeMarche = 'forex' | 'actions' | 'crypto';
export type DirectionTrade = 'achat' | 'vente';
export type StatutPosition = 'ouverte' | 'fermee' | 'annulee';
export type StatutPortefeuille = 'actif' | 'pause' | 'suspendu';
export type NomAgent = 'pdg' | 'analyseur_technique' | 'analyseur_fondamental' | 'gestionnaire_risque' | 'trader_executeur';
export type NomFournisseur = 'mock' | 'anthropic' | 'gemini' | 'openai';
export type ModeDeclenchement = 'manuel' | 'cron' | 'automatique';
export type DecisionFinale = 'achat' | 'vente' | 'attente';

// ─── Cotations ────────────────────────────────────────────────────

export interface Cotation {
  symbole: string;
  nom: string;
  marche: TypeMarche;
  prix: number;
  variation: number;
  variationPct: number;
  volumeJour?: number;
  high24h?: number;
  low24h?: number;
  derniereMaj: string;
}

export interface DonneesHistoriques {
  date: string;
  ouverture: number;
  haut: number;
  bas: number;
  cloture: number;
  volume: number;
}

export interface IndicateursTechniques {
  rsi14?: number;
  mm20?: number;
  mm50?: number;
  mm200?: number;
  macdLigne?: number;
  macdSignal?: number;
  macdHistogramme?: number;
  bbHaut?: number;
  bbMilieu?: number;
  bbBas?: number;
  tendance?: 'haussiere' | 'baissiere' | 'neutre' | 'laterale';
  forceSignal?: number;
}

// ─── Portfolio & Positions ────────────────────────────────────────

export interface Portefeuille {
  id: string;
  nom: string;
  devise: string;
  profil: string;
  capitalInitial: number;
  capitalActuel: number;
  statut: StatutPortefeuille;
  cree_le: string;
  mis_a_jour_le: string;
}

export interface Position {
  id: string;
  portefeuilleId: string;
  symbole: string;
  marche: TypeMarche;
  direction: DirectionTrade;
  taille: number;
  prixEntree: number;
  stopLoss?: number;
  takeProfit?: number;
  prixSortie?: number;
  pnl?: number;
  statut: StatutPosition;
  ouvert_le: string;
  ferme_le?: string;
  cycleId?: string;
  raisonnement?: string;
}

export interface OrdreExecution {
  symbole: string;
  marche: TypeMarche;
  direction: DirectionTrade;
  taille: number;
  prixEntree: number;
  stopLoss?: number;
  takeProfit?: number;
  raisonnement: string;
}

// ─── IA & Fournisseurs ────────────────────────────────────────────

export interface MessageIA {
  role: 'user' | 'assistant';
  contenu: string;
}

export interface RequeteIA {
  agent: NomAgent;
  systemPrompt?: string;
  prompt: string;
  historique?: MessageIA[];
  contexte?: Record<string, string | number>;
}

export interface ReponseIA {
  contenu: string;
  tokensEntree?: number;
  tokensSortie?: number;
  modele: string;
}

export interface FournisseurIA {
  nom: NomFournisseur;
  modeleDefaut: string;
  modelesDisponibles: string[];
  generer(requete: RequeteIA, modele?: string): Promise<ReponseIA>;
  testerConnexion(modele?: string): Promise<{ succes: boolean; message: string }>;
}

export interface ConfigAgent {
  id: string;
  agent: NomAgent;
  fournisseur: NomFournisseur;
  modele: string;
  actif: boolean;
  mis_a_jour_le: string;
}

// ─── Cycles de décision ───────────────────────────────────────────

export interface MessageAgentDB {
  id: string;
  cycleId: string;
  agent: NomAgent;
  roleAgent: string;
  contenu: string;
  fournisseur?: NomFournisseur;
  modele?: string;
  cree_le: string;
}

export interface CycleDecision {
  id: string;
  portefeuilleId: string;
  declenchePar: ModeDeclenchement;
  decisionFinale?: DecisionFinale;
  execute_le: string;
  messages?: MessageAgentDB[];
  nbTradesExecutes?: number;
}

// ─── Instruments suivis ───────────────────────────────────────────

export const INSTRUMENTS: { symbole: string; nom: string; marche: TypeMarche }[] = [
  { symbole: 'EURUSD=X', nom: 'EUR/USD', marche: 'forex' },
  { symbole: 'GBPUSD=X', nom: 'GBP/USD', marche: 'forex' },
  { symbole: 'USDCAD=X', nom: 'USD/CAD', marche: 'forex' },
  { symbole: 'QQQ', nom: 'Nasdaq ETF', marche: 'actions' },
  { symbole: 'AAPL', nom: 'Apple', marche: 'actions' },
  { symbole: 'MSFT', nom: 'Microsoft', marche: 'actions' },
  { symbole: 'NVDA', nom: 'NVIDIA', marche: 'actions' },
  { symbole: 'TSLA', nom: 'Tesla', marche: 'actions' },
  { symbole: 'BTC-USD', nom: 'Bitcoin', marche: 'crypto' },
  { symbole: 'ETH-USD', nom: 'Ethereum', marche: 'crypto' },
];

export const NOMS_AGENTS: Record<NomAgent, string> = {
  pdg: 'PDG / Orchestrateur',
  analyseur_technique: 'Analyste Technique',
  analyseur_fondamental: 'Analyste Fondamental',
  gestionnaire_risque: 'Gestionnaire de Risque',
  trader_executeur: 'Trader Exécuteur',
};
