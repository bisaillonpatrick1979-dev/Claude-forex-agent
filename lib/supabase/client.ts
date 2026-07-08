// Client Supabase — TradingLab IA
// Deux instances : client navigateur (anon) et serveur (service role)

import { createClient } from '@supabase/supabase-js';

// ─── Client côté navigateur (clé anon, lecture seule pour la démo) ─
export function creerClientSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !cle) {
    throw new Error('Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requises');
  }

  return createClient(url, cle, {
    auth: { persistSession: true },
  });
}

// ─── Client côté serveur (service role, accès complet) ─────────────
export function creerClientServeur() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !cle) {
    throw new Error('Variables Supabase manquantes côté serveur');
  }

  return createClient(url, cle, {
    auth: { persistSession: false },
  });
}

// Instance singleton pour les Server Components
let _clientServeur: ReturnType<typeof creerClientServeur> | null = null;

export function obtenirClientServeur() {
  if (!_clientServeur) {
    _clientServeur = creerClientServeur();
  }
  return _clientServeur;
}
