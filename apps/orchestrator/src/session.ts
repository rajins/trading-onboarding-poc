export interface Session {
  id: string;
  customer_id?: string;
  product_code?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: unknown }>;
  created_at: string;
}

const sessions = new Map<string, Session>();

export function getOrCreateSession(id: string): Session {
  if (!sessions.has(id)) {
    sessions.set(id, { id, messages: [], created_at: new Date().toISOString() });
  }
  return sessions.get(id)!;
}

export function updateSession(id: string, updates: Partial<Session>): void {
  const session = getOrCreateSession(id);
  Object.assign(session, updates);
}

export function getAllSessions(): Session[] {
  return Array.from(sessions.values());
}
