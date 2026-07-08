-- ═══════════════════════════════════════════════════════════════════
-- SCHÉMA SUPABASE — TradingLab IA
-- Exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor)
-- ═══════════════════════════════════════════════════════════════════

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Table : Portefeuilles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portefeuilles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  description TEXT,
  capital_initial DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
  capital_actuel DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
  drawdown_max DECIMAL(8,4) DEFAULT 10.00,    -- % max avant arrêt auto
  risque_par_trade DECIMAL(5,2) DEFAULT 1.00, -- % du capital par trade
  max_positions_par_marche INTEGER DEFAULT 3,
  statut TEXT NOT NULL DEFAULT 'actif'
    CHECK (statut IN ('actif', 'pause', 'arrete')),
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mis_a_jour_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Table : Positions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portefeuille_id UUID NOT NULL REFERENCES portefeuilles(id) ON DELETE CASCADE,
  cycle_id UUID,                               -- lié au cycle qui a ouvert
  symbole TEXT NOT NULL,
  marche TEXT NOT NULL
    CHECK (marche IN ('forex', 'actions', 'crypto')),
  direction TEXT NOT NULL
    CHECK (direction IN ('achat', 'vente')),
  taille DECIMAL(15,6) NOT NULL,               -- lots/actions/coins
  prix_entree DECIMAL(15,6) NOT NULL,
  stop_loss DECIMAL(15,6),
  take_profit DECIMAL(15,6),
  prix_sortie DECIMAL(15,6),
  pnl DECIMAL(15,2),
  statut TEXT NOT NULL DEFAULT 'ouverte'
    CHECK (statut IN ('ouverte', 'fermee', 'annulee')),
  raisonnement TEXT,                           -- raisonnement de l'agent
  ouvert_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ferme_le TIMESTAMPTZ
);

-- ─── Table : Cycles de décision ──────────────────────────────────
CREATE TABLE IF NOT EXISTS cycles_decision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portefeuille_id UUID NOT NULL REFERENCES portefeuilles(id) ON DELETE CASCADE,
  declenche_par TEXT NOT NULL DEFAULT 'manuel'
    CHECK (declenche_par IN ('manuel', 'cron', 'automatique')),
  decision_finale JSONB,                       -- JSON de la décision PDG
  nb_trades_executes INTEGER DEFAULT 0,
  duree_ms INTEGER,                            -- durée du cycle en ms
  execute_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Table : Messages des agents ─────────────────────────────────
CREATE TABLE IF NOT EXISTS messages_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES cycles_decision(id) ON DELETE CASCADE,
  agent TEXT NOT NULL
    CHECK (agent IN ('pdg', 'analyseur_technique', 'analyseur_fondamental', 'gestionnaire_risque', 'trader_executeur')),
  role_agent TEXT NOT NULL,
  contenu TEXT NOT NULL,
  fournisseur TEXT,          -- quel fournisseur IA a généré ce message
  modele TEXT,               -- quel modèle spécifique
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Table : Cache des cotations ─────────────────────────────────
CREATE TABLE IF NOT EXISTS cotations_cache (
  symbole TEXT PRIMARY KEY,
  donnees_json JSONB NOT NULL,
  mis_a_jour_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Table : Journal de performance ──────────────────────────────
CREATE TABLE IF NOT EXISTS journal_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portefeuille_id UUID NOT NULL REFERENCES portefeuilles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  valeur_totale DECIMAL(15,2) NOT NULL,
  pnl_jour DECIMAL(15,2) DEFAULT 0,
  drawdown DECIMAL(8,4) DEFAULT 0,
  nb_positions INTEGER DEFAULT 0,
  UNIQUE(portefeuille_id, date)
);

-- ─── Table : Configuration des agents ────────────────────────────
CREATE TABLE IF NOT EXISTS config_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL UNIQUE
    CHECK (agent IN ('pdg', 'analyseur_technique', 'analyseur_fondamental', 'gestionnaire_risque', 'trader_executeur')),
  fournisseur TEXT NOT NULL DEFAULT 'mock'
    CHECK (fournisseur IN ('mock', 'anthropic', 'gemini', 'openai')),
  modele TEXT NOT NULL DEFAULT 'mock-v1',
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  mis_a_jour_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Données initiales ────────────────────────────────────────────

-- Configuration par défaut des agents (mode mock)
INSERT INTO config_agents (agent, fournisseur, modele, actif) VALUES
  ('pdg', 'mock', 'mock-v1', true),
  ('analyseur_technique', 'mock', 'mock-v1', true),
  ('analyseur_fondamental', 'mock', 'mock-v1', true),
  ('gestionnaire_risque', 'mock', 'mock-v1', true),
  ('trader_executeur', 'mock', 'mock-v1', true)
ON CONFLICT (agent) DO NOTHING;

-- Portefeuille de départ (conservateur)
INSERT INTO portefeuilles (nom, description, capital_initial, capital_actuel, drawdown_max, risque_par_trade)
VALUES ('Conservateur', 'Stratégie prudente, max 1% de risque par trade', 100000.00, 100000.00, 10.00, 1.00)
ON CONFLICT DO NOTHING;

-- ─── Fonctions de mise à jour automatique ────────────────────────

CREATE OR REPLACE FUNCTION mise_a_jour_horodatage()
RETURNS TRIGGER AS $$
BEGIN
  NEW.mis_a_jour_le = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_portefeuille_maj
  BEFORE UPDATE ON portefeuilles
  FOR EACH ROW EXECUTE FUNCTION mise_a_jour_horodatage();

CREATE OR REPLACE TRIGGER trigger_config_agents_maj
  BEFORE UPDATE ON config_agents
  FOR EACH ROW EXECUTE FUNCTION mise_a_jour_horodatage();

-- ─── Row Level Security (RLS) ─────────────────────────────────────
-- Politique simple : un seul utilisateur admin

ALTER TABLE portefeuilles ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles_decision ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotations_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_agents ENABLE ROW LEVEL SECURITY;

-- Politique : accès complet via service role (pour les API routes)
-- Le frontend utilise la clé anon avec des politiques permissives pour la démo
CREATE POLICY "Acces complet authentifie" ON portefeuilles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acces complet authentifie" ON positions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acces complet authentifie" ON cycles_decision
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acces complet authentifie" ON messages_agents
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acces complet authentifie" ON cotations_cache
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acces complet authentifie" ON journal_performance
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acces complet authentifie" ON config_agents
  FOR ALL USING (true) WITH CHECK (true);

-- ─── Index pour les performances ─────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_positions_portefeuille ON positions(portefeuille_id);
CREATE INDEX IF NOT EXISTS idx_positions_statut ON positions(statut);
CREATE INDEX IF NOT EXISTS idx_cycles_portefeuille ON cycles_decision(portefeuille_id);
CREATE INDEX IF NOT EXISTS idx_messages_cycle ON messages_agents(cycle_id);
CREATE INDEX IF NOT EXISTS idx_journal_portefeuille_date ON journal_performance(portefeuille_id, date);

-- ─── Table : Leçons apprises par les agents ──────────────────────
-- Mémoire persistante : chaque erreur analysée génère une leçon
-- réinjectée dans les prompts des cycles suivants
CREATE TABLE IF NOT EXISTS lecons_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portefeuille_id UUID REFERENCES portefeuilles(id) ON DELETE CASCADE,
  agent TEXT NOT NULL
    CHECK (agent IN ('pdg','analyseur_technique','analyseur_fondamental','gestionnaire_risque','trader_executeur')),
  symbole TEXT,
  lecon TEXT NOT NULL,                    -- Leçon formulée en 1-2 phrases
  contexte JSONB,                         -- {direction, prixEntree, prixSortie, pnl, rsi, tendance, ...}
  type_erreur TEXT,                       -- 'faux_signal', 'timing', 'mauvais_rr', 'news_ignorees', etc.
  position_id UUID REFERENCES positions(id),
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lecons_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acces complet authentifie" ON lecons_agents
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_lecons_portefeuille ON lecons_agents(portefeuille_id);
CREATE INDEX IF NOT EXISTS idx_lecons_agent ON lecons_agents(agent, portefeuille_id);
CREATE INDEX IF NOT EXISTS idx_lecons_date ON lecons_agents(cree_le DESC);
