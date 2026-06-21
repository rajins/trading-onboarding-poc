import type Anthropic from '@anthropic-ai/sdk';
import { pool } from './db.js';

export interface Session {
  id: string;
  customer_id?: string;
  product_code?: string;
  messages: Anthropic.MessageParam[];
  created_at: string;
}

export async function getOrCreateSession(id: string): Promise<Session> {
  const { rows } = await pool.query<{
    id: string;
    customer_id: string | null;
    product_code: string | null;
    messages: Anthropic.MessageParam[];
    created_at: Date;
  }>(
    `INSERT INTO sessions (id) VALUES ($1)
     ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id
     RETURNING id, customer_id, product_code, messages, created_at`,
    [id]
  );
  const row = rows[0];
  return {
    id: row.id,
    customer_id: row.customer_id ?? undefined,
    product_code: row.product_code ?? undefined,
    messages: row.messages,
    created_at: row.created_at.toISOString(),
  };
}

export async function saveSession(session: Session): Promise<void> {
  await pool.query(
    `UPDATE sessions
     SET messages = $1, customer_id = $2, product_code = $3, updated_at = NOW()
     WHERE id = $4`,
    [JSON.stringify(session.messages), session.customer_id ?? null, session.product_code ?? null, session.id]
  );
}

export async function getAllSessions(): Promise<Session[]> {
  const { rows } = await pool.query<{
    id: string;
    customer_id: string | null;
    product_code: string | null;
    messages: Anthropic.MessageParam[];
    created_at: Date;
  }>(`SELECT id, customer_id, product_code, messages, created_at FROM sessions ORDER BY created_at DESC`);

  return rows.map(row => ({
    id: row.id,
    customer_id: row.customer_id ?? undefined,
    product_code: row.product_code ?? undefined,
    messages: row.messages,
    created_at: row.created_at.toISOString(),
  }));
}
