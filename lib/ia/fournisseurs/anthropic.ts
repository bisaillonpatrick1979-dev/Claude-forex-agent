// Adaptateur Anthropic Claude — activé si ANTHROPIC_API_KEY définie
import type { FournisseurIA, RequeteIA, ReponseIA } from '@/types';

export class FournisseurAnthropic implements FournisseurIA {
  readonly nom = 'anthropic' as const;
  readonly modeleDefaut = 'claude-haiku-4-5-20251001';
  readonly modelesDisponibles = [
    'claude-haiku-4-5-20251001',
    'claude-sonnet-5',
  ];

  private obtenirCle(): string {
    const cle = process.env.ANTHROPIC_API_KEY;
    if (!cle) throw new Error('ANTHROPIC_API_KEY non définie');
    return cle;
  }

  async generer(requete: RequeteIA, modele?: string): Promise<ReponseIA> {
    const cle = this.obtenirCle();
    const modeleEffectif = modele ?? this.modeleDefaut;

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: cle });

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (requete.historique) {
      for (const msg of requete.historique) {
        messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.contenu });
      }
    }

    messages.push({ role: 'user', content: requete.prompt });

    const reponse = await client.messages.create({
      model: modeleEffectif,
      max_tokens: 1024,
      system: requete.systemPrompt,
      messages,
    });

    const contenu = reponse.content[0].type === 'text' ? reponse.content[0].text : '';

    return {
      contenu,
      tokensEntree: reponse.usage.input_tokens,
      tokensSortie: reponse.usage.output_tokens,
      modele: modeleEffectif,
    };
  }

  async testerConnexion(modele?: string): Promise<{ succes: boolean; message: string }> {
    try {
      const cle = this.obtenirCle();
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: cle });

      const modeleTest = modele ?? this.modeleDefaut;
      await client.messages.create({
        model: modeleTest,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Bonjour' }],
      });

      return { succes: true, message: `Anthropic connecté (${modeleTest})` };
    } catch (err) {
      return {
        succes: false,
        message: `Erreur Anthropic : ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}

export const fournisseurAnthropic = new FournisseurAnthropic();
