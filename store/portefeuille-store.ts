// Store Zustand — état global du portefeuille et des cotations
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cotation, Portefeuille, CycleDecision } from '@/types';

interface EtatPortefeuille {
  // Portefeuille sélectionné
  portefeuilleId: string | null;
  portefeuille: Portefeuille | null;
  // Cotations en temps réel
  cotations: Cotation[];
  derniereMaj: string | null;
  // Dernier cycle
  dernierCycle: CycleDecision | null;
  // Taille de police (4 niveaux)
  taillePolicePx: 13 | 14 | 16 | 18;
  // Actions
  definirPortefeuille: (id: string, p: Portefeuille) => void;
  mettreAJourCotations: (cotations: Cotation[]) => void;
  definirDernierCycle: (cycle: CycleDecision | null) => void;
  definirTaillePolice: (taille: 13 | 14 | 16 | 18) => void;
  reinitialiser: () => void;
}

export const utiliserPortefeuilleStore = create<EtatPortefeuille>()(
  persist(
    (set) => ({
      portefeuilleId: null,
      portefeuille: null,
      cotations: [],
      derniereMaj: null,
      dernierCycle: null,
      taillePolicePx: 14,

      definirPortefeuille: (id, p) => set({ portefeuilleId: id, portefeuille: p }),

      mettreAJourCotations: (cotations) =>
        set({ cotations, derniereMaj: new Date().toISOString() }),

      definirDernierCycle: (cycle) => set({ dernierCycle: cycle }),

      definirTaillePolice: (taille) => set({ taillePolicePx: taille }),

      reinitialiser: () =>
        set({
          portefeuilleId: null,
          portefeuille: null,
          cotations: [],
          derniereMaj: null,
          dernierCycle: null,
        }),
    }),
    { name: 'tradinglab-portefeuille' }
  )
);

// Libellés des tailles de police
export const TAILLES_POLICE: Array<{ px: 13 | 14 | 16 | 18; label: string }> = [
  { px: 13, label: 'Compact' },
  { px: 14, label: 'Normal' },
  { px: 16, label: 'Grand' },
  { px: 18, label: 'Très grand' },
];
