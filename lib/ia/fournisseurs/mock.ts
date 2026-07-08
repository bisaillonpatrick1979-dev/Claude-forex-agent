// Fournisseur IA simulé — réponses réalistes sans clé API
import type { FournisseurIA, RequeteIA, ReponseIA, NomAgent } from '@/types';

// ─── Réponses mock réalistes par agent ──────────────────────

const TEMPLATES_REPONSES: Record<NomAgent, string[]> = {
  analyseur_technique: [
    `ANALYSE TECHNIQUE — {symbole}

Tendance principale : HAUSSIÈRE
Prix actuel : {prix} | MM20 : en-dessous du prix

RSI(14) : 58.4 — Zone neutre, momentum positif
MACD : Croisement haussier récent (+0.0012)
Bollinger : Prix dans la moitié supérieure des bandes

Niveaux clés :
- Support fort : {support}
- Résistance : {resistance}
- Stop-loss suggéré : {stop_loss}

Probabilité d'un mouvement haussier : 67%
Recommandation : ACHAT avec gestion du risque stricte`,

    `ANALYSE TECHNIQUE — {symbole}

Tendance principale : BAISSIÈRE
Prix actuel : {prix} | MM20 : au-dessus du prix

RSI(14) : 72.1 — Zone de SURACHAT — attention
MACD : Divergence baissière en formation
Bollinger : Prix touche la bande supérieure

Niveaux clés :
- Résistance forte : {resistance}
- Support : {support}
- Stop-loss suggéré : {stop_loss}

Probabilité d'un repli : 71%
Recommandation : VENTE ou ATTENTE de confirmation`,

    `ANALYSE TECHNIQUE — {symbole}

Tendance principale : LATÉRALE
Prix actuel : {prix} | Range établi

RSI(14) : 49.8 — Zone neutre
MACD : Faible — signal non confirmé
Bollinger : Contraction des bandes (faible volatilité)

Niveaux clés :
- Borne haute du range : {resistance}
- Borne basse du range : {support}

Signal : NEUTRE
Recommandation : ATTENDRE une cassure claire du range`,
  ],

  analyseur_fondamental: [
    `ANALYSE FONDAMENTALE — {symbole}

Contexte macroéconomique : Modérément favorable
Sentiment du marché : Positif (Risk-On)

Facteurs favorables :
- Données économiques américaines solides
- Fed en pause dans son cycle de hausse
- Appétit pour le risque global élevé

Facteurs de risque :
- Tensions géopolitiques persistantes
- Incertitude sur la trajectoire de l'inflation
- Valorisations élevées sur certains marchés

Biais fondamental : LÉGÈREMENT HAUSSIER
Horizon recommandé : Court terme (1-5 jours)`,

    `ANALYSE FONDAMENTALE — {symbole}

Contexte macroéconomique : Prudent
Sentiment du marché : Mixte (Risk-Off partiel)

Facteurs favorables :
- Données d'emploi robustes
- Stabilité des marchés obligataires

Facteurs de risque :
- Inflation au-dessus des cibles des banques centrales
- Ralentissement possible en Chine
- Élections à venir créant de l'incertitude

Biais fondamental : NEUTRE à LÉGÈREMENT BAISSIER
Horizon recommandé : Prudence à court terme`,
  ],

  gestionnaire_risque: [
    `ÉVALUATION DES RISQUES

Capital total : {capital} | Positions ouvertes : {nb_positions}
Drawdown actuel : {drawdown}%

Analyse de l'ordre proposé :
- Risque par trade : {risque_pct}% du capital
- Taille recommandée : {taille} unités
- Stop-loss calculé : {stop_loss}
- Take-profit cible : {take_profit}
- Ratio R/R : {ratio_rr}

Règles de risque :
✅ Risque < 1% du capital
✅ Moins de 3 positions sur ce marché
✅ Stop-loss défini
✅ Ratio R/R > 1.5

DÉCISION : ORDRE APPROUVÉ
Taille autorisée : {taille} unités`,

    `ÉVALUATION DES RISQUES

Capital total : {capital} | Positions ouvertes : {nb_positions}
Drawdown actuel : {drawdown}%

Analyse de l'ordre proposé :
- Risque calculé : TROP ÉLEVÉ
- Ajustement nécessaire

Règles de risque :
⚠️ Risque dépasse 1% du capital
✅ Positions dans les limites

DÉCISION : ORDRE MODIFIÉ
Taille recommandée réduite à {taille} unités pour respecter la règle du 1%`,
  ],

  trader_executeur: [
    `RAPPORT D'EXÉCUTION

Ordre exécuté : {direction} {symbole}
Prix d'entrée : {prix}
Taille : {taille} unités
Stop-loss : {stop_loss}
Take-profit : {take_profit}

Simulation paper trading :
- Spread appliqué : {spread} pips
- Prix effectif : {prix_effectif}
- Capital utilisé : {capital_utilise}
- Risque total : {risque_total}

Statut : POSITION OUVERTE
ID de position : P-{timestamp}`,

    `RAPPORT D'EXÉCUTION

Pas d'ordre à exécuter ce cycle.

Raisons :
- Signal non suffisamment fort (< 60%)
- Conditions de marché défavorables
- Limite de positions atteinte sur ce marché

Action : MAINTIEN DES POSITIONS ACTUELLES
Surveillance : Continue
Prochain signal attendu : À la prochaine analyse`,
  ],

  pdg: [
    `DÉCISION EXÉCUTIVE — CYCLE DE TRADING

Synthèse des analyses reçues :
- Analyse technique : Signal HAUSSIER (confiance 67%)
- Analyse fondamentale : Biais positif
- Gestionnaire de risque : Ordre approuvé
- Trader : Prêt à exécuter

DÉCISION FINALE : EXÉCUTER
Instrument : {symbole}
Direction : ACHAT
Taille : {taille} unités
Justification : Convergence des signaux techniques et fondamentaux avec gestion du risque validée.

Le trading simulé suit nos règles internes. Capital fictif uniquement.`,

    `DÉCISION EXÉCUTIVE — CYCLE DE TRADING

Synthèse des analyses reçues :
- Analyse technique : Signal NEUTRE à BAISSIER
- Analyse fondamentale : Incertitude macroéconomique
- Gestionnaire de risque : Conditions limites

DÉCISION FINALE : ATTENDRE
Justification : Manque de convergence entre les signaux. Le risque/récompense n'est pas optimal dans les conditions actuelles.

Prochain cycle : Dans 15 minutes.
Capital protégé : Priorité absolue.`,
  ],
};

// ─── Classe FournisseurMock ──────────────────────────────────

export class FournisseurMock implements FournisseurIA {
  readonly nom = 'mock' as const;
  readonly modeleDefaut = 'mock-v1';
  readonly modelesDisponibles = ['mock-v1'];

  async generer(requete: RequeteIA): Promise<ReponseIA> {
    // Délai simulé réaliste (500ms à 2s)
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 1500));

    const templates = TEMPLATES_REPONSES[requete.agent] ?? TEMPLATES_REPONSES.pdg;
    const index = Math.floor(Math.random() * templates.length);
    let contenu = templates[index];

    // Substitution des variables contextuelles
    if (requete.contexte) {
      const ctx = requete.contexte as Record<string, string | number>;
      Object.entries(ctx).forEach(([cle, valeur]) => {
        contenu = contenu.replace(new RegExp(`\\{${cle}\\}`, 'g'), String(valeur));
      });
    }

    // Nettoyer les variables non substituées
    contenu = contenu.replace(/\{[^}]+\}/g, 'N/A');

    return {
      contenu,
      tokensEntree: requete.prompt.length / 4,
      tokensSortie: contenu.length / 4,
      modele: 'mock-v1',
    };
  }

  async testerConnexion(): Promise<{ succes: boolean; message: string }> {
    return {
      succes: true,
      message: 'Fournisseur mock opérationnel — aucune clé API requise',
    };
  }
}

export const fournisseurMock = new FournisseurMock();
