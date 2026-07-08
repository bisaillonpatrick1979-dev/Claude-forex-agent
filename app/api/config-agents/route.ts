// API /api/config-agents — lecture et mise à jour des configurations d'agents
import { NextRequest, NextResponse } from 'next/server';
import {
  listerConfigAgents,
  mettreAJourConfigAgent,
} from '@/lib/supabase/services/config-agents';
import type { NomAgent, NomFournisseur } from '@/types';

export async function GET() {
  try {
    const configs = await listerConfigAgents();
    return NextResponse.json(configs);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const corps = await req.json();
    const { agent, fournisseur, modele, actif } = corps;

    if (!agent) {
      return NextResponse.json({ error: 'Champ agent requis' }, { status: 400 });
    }

    const config = await mettreAJourConfigAgent(agent as NomAgent, {
      fournisseur: fournisseur as NomFournisseur | undefined,
      modele,
      actif,
    });

    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
