// API /api/config-agents/test — test de connexion à un fournisseur IA
import { NextRequest, NextResponse } from 'next/server';
import { obtenirFournisseur } from '@/lib/ia/fournisseurs/registre';
import type { NomFournisseur } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { fournisseur, modele } = await req.json();

    if (!fournisseur) {
      return NextResponse.json({ error: 'Champ fournisseur requis' }, { status: 400 });
    }

    const instance = obtenirFournisseur(fournisseur as NomFournisseur);
    const resultat = await instance.testerConnexion(modele);

    return NextResponse.json(resultat, { status: resultat.succes ? 200 : 400 });
  } catch (err) {
    return NextResponse.json({ succes: false, message: String(err) }, { status: 500 });
  }
}
