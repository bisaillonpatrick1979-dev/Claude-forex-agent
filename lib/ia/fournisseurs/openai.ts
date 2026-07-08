// Adaptateur OpenAI — activé si OPENAI_API_KEY définie
import type { FournisseurIA, RequeteIA, ReponseIA } from '@/types';

export class FournisseurOpenAI implements FournisseurIA {
  readonly nom = 'openai' as const;
  readonly modeleDefaut = 'gpt-4o-mini';
  readonly modelesDisponibles = [
    'gpt-4o-mini',
    'gpt-4o',
  ];

  private obtenirCle(): string {
    const cle = process.env.OPENAI_API_KEY;
    if (!cle) throw new Error('OPENAI_API_KEY non définie');
    return cle;
  }

  async generer(requete: RequeteIA, modele?: string): Promise<ReponseIA> {
    const cle = this.obtenirCle();
    const modeleEffectif = modele ?? this.modeleDefaut;

    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: cle });

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (requete.systemPrompt) {
      messages.push({ role: 'system', content: requete.systemPrompt });
    }

    if (requete.historique) {
      for (const msg of requete.historique) {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.contenu,
        });
      }
    }

    messages.push({ role: 'user', content: requete.prompt });

    const completion = await client.chat.completions.create({
      model: modeleEffectif,
      messages,
      max_tokens: 1024,
    });

    const contenu = completion.choices[0]?.message?.content ?? '';

    return {
      contenu,
      tokensEntree: completion.usage?.prompt_tokens ?? 0,
      tokensSortie: completion.usage?.completion_tokens ?? 0,
      modele: modeleEffectif,
    };
  }

  async testerConnexion(modele?: string): Promise<{ succes: boolean; message: string }> {
    try {
      const cle = this.obtenirCle();
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: cle });

      const modeleTest = modele ?? this.modeleDefaut;
      await client.chat.completions.create({
        model: modeleTest,
        messages: [{ role: 'user', content: 'Bonjour' }],
        max_tokens: 5,
      });

      return { succes: true, message: `OpenAI connecté (${modeleTest})` };
    } catch (err) {
      return {
        succes: false,
        message: `Erreur OpenAI : ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}

export const fournisseurOpenAI = new FournisseurOpenAI();
