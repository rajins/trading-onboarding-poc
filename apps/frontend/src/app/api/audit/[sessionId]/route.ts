import { NextRequest, NextResponse } from 'next/server';

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3001';

export async function GET(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  const res = await fetch(`${ORCHESTRATOR_URL}/audit/${params.sessionId}`);
  return NextResponse.json(await res.json());
}
