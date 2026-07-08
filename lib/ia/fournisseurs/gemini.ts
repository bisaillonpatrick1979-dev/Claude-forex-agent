// Adaptateur Google Gemini — activé si GOOGLE_GEMINI_API_KEY définie
import type { FournisseurIA, RequeteIA, ReponseIA } from '@/types';

export class FournisseurGemini implements FournisseurIA {
  readonly nom = 'gemini' as const;
  readonly modeleDefaut = 'gemini-2.0-flash-lite';
  readonly modelesDisponibles = [
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
  ];

  private obtenirCle(): string {
    const cle = process.env.GOOGLE_GEMINI_API_KEY;
    if (!cle) throw new Error('GOOGLE_GEMINI_API_KEY non définie');
    return cle;
  }

  async generer(requete: RequeteIA, modele?: string): Promise<ReponseIA> {
    const cle = this.obtenirCle();
    const modeleEffectif = modele ?? this.modeleDefaut;

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const client = new GoogleGenerativeAI(cle);
    const instance = client.getGenerativeModel({
      model: modeleEffectif,
      systemInstruction: requete.systemPrompt,
    });

    // Construire l'historique de conversation
    const historique = (requete.historique ?? []).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.contenu }],
    }));

    const chat = instance.startChat({ history: historique });
    const resultat = await chat.sendMessage(requete.prompt);
    const contenu = resultat.response.text();

    const usageMetadata = resultat.response.usageMetadata;

    return {
      contenu,
      tokensEntree: usageMetadata?.promptTokenCount ?? 0,
      tokensSortie: usageMetadata?.candidatesTokenCount ?? 0,
      modele: modeleEffectif,
    };
  }

  async testerConnexion(modele?: string): Promise<{ succes: boolean; message: string }> {
    try {
      const cle = this.obtenirCle();
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const client = new GoogleGenerativeAI(cle);

      const modeleTest = modele ?? this.modeleDefaut;
      const instance = client.getGenerativeModel({ model: modeleTest });
      await instance.generateContent('Bonjour');

      return { succes: true, message: `Gemini connecté (${modeleTest})` };
    } catch (err) {
      return {
        succes: false,
        message: `Erreur Gemini : ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}

export const fournisseurGemini = new FournisseurGemini();
