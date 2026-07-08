// Registre des fournisseurs IA — résolution selon la configuration
import type { FournisseurIA, NomFournisseur } from '@/types';
import { fournisseurMock } from './mock';
import { fournisseurAnthropic } from './anthropic';
import { fournisseurGemini } from './gemini';
import { fournisseurOpenAI } from './openai';

// Map de tous les fournisseurs disponibles
const FOURNISSEURS: Record<NomFournisseur, FournisseurIA> = {
  mock: fournisseurMock,
  anthropic: fournisseurAnthropic,
  gemini: fournisseurGemini,
  openai: fournisseurOpenAI,
};

// Résoudre le fournisseur pour un agent
// Si IA_MODE=mock ou si la clé API est absente → retour vers mock
export function obtenirFournisseur(nomFournisseur: NomFournisseur): FournisseurIA {
  const modeIA = process.env.IA_MODE ?? 'mock';

  if (modeIA === 'mock') return fournisseurMock;

  const fournisseur = FOURNISSEURS[nomFournisseur];
  if (!fournisseur) return fournisseurMock;

  // Vérifier que la clé API est disponible
  if (nomFournisseur === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY manquante — repli sur mock');
    return fournisseurMock;
  }
  if (nomFournisseur === 'gemini' && !process.env.GOOGLE_GEMINI_API_KEY) {
    console.warn('GOOGLE_GEMINI_API_KEY manquante — repli sur mock');
    return fournisseurMock;
  }
  if (nomFournisseur === 'openai' && !process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY manquante — repli sur mock');
    return fournisseurMock;
  }

  return fournisseur;
}

// Obtenir tous les fournisseurs disponibles (avec leurs clés)
export function listerFournisseursDisponibles(): NomFournisseur[] {
  const disponibles: NomFournisseur[] = ['mock'];
  if (process.env.ANTHROPIC_API_KEY) disponibles.push('anthropic');
  if (process.env.GOOGLE_GEMINI_API_KEY) disponibles.push('gemini');
  if (process.env.OPENAI_API_KEY) disponibles.push('openai');
  return disponibles;
}

export { FOURNISSEURS };
