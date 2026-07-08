// Page Réglages — configuration des agents et des préférences
import { listerConfigAgents } from '@/lib/supabase/services/config-agents';
import { listerPortefeuilles } from '@/lib/supabase/services/portefeuilles';
import PageReglages from '@/components/page-reglages';
import type { ConfigAgent, Portefeuille } from '@/types';

export const dynamic = 'force-dynamic';

export default async function RouteReglages() {
  let configAgents: ConfigAgent[] = [];
  let portefeuilles: Portefeuille[] = [];

  try {
    [configAgents, portefeuilles] = await Promise.all([
      listerConfigAgents(),
      listerPortefeuilles(),
    ]);
  } catch {
    // Supabase non configuré
  }

  const modeIA = process.env.IA_MODE ?? 'mock';

  return (
    <PageReglages
      configAgents={configAgents}
      portefeuilles={portefeuilles}
      modeIA={modeIA}
    />
  );
}
