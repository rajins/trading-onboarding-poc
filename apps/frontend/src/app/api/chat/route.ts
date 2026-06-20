import { NextRequest, NextResponse } from 'next/server';
import { ORCHESTRATOR_URL } from '@/lib/orchestrator';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${ORCHESTRATOR_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json());
}
