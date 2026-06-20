import { NextResponse } from 'next/server';
import { ORCHESTRATOR_URL } from '@/lib/orchestrator';

export async function GET(_: Request, { params }: { params: { sessionId: string } }) {
  const res = await fetch(`${ORCHESTRATOR_URL}/audit/${params.sessionId}`);
  return NextResponse.json(await res.json());
}
