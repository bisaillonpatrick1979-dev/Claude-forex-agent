import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ error: 'Utilisez /api/cycle à la place' }, { status: 410 });
}
