import type Anthropic from '@anthropic-ai/sdk';

export interface Session {
  id: string;
  customer_id?: string;
  product_code?: string;
  messages: Anthropic.MessageParam[];
  created_at: string;
}

const sessions = new Map<string, Session>();

export function getOrCreateSession(id: string): Session {
  if (!sessions.has(id)) {
    sessions.set(id, { id, messages: [], created_at: new Date().toISOString() });
  }
  return sessions.get(id)!;
}

export function getAllSessions(): Session[] {
  return Array.from(sessions.values());
}
