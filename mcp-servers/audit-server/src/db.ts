import pg from 'pg';

const { Pool } = pg;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id              SERIAL PRIMARY KEY,
      session_id      TEXT NOT NULL,
      customer_id     TEXT,
      event_type      TEXT NOT NULL,
      tool_name       TEXT,
      input_snapshot  JSONB,
      output_snapshot JSONB,
      decision        TEXT,
      rule_version    TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_audit_session  ON audit_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_audit_customer ON audit_events(customer_id);
  `);
}

export async function writeAuditEvent(params: {
  session_id: string;
  customer_id?: string;
  event_type: string;
  tool_name?: string;
  input_snapshot?: unknown;
  output_snapshot?: unknown;
  decision?: string;
  rule_version?: string;
}): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO audit_events
      (session_id, customer_id, event_type, tool_name, input_snapshot, output_snapshot, decision, rule_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      params.session_id,
      params.customer_id ?? null,
      params.event_type,
      params.tool_name ?? null,
      params.input_snapshot ? JSON.stringify(params.input_snapshot) : null,
      params.output_snapshot ? JSON.stringify(params.output_snapshot) : null,
      params.decision ?? null,
      params.rule_version ?? null,
    ]
  );
  return rows[0].id;
}

export async function getAuditTrail(session_id: string): Promise<unknown[]> {
  const { rows } = await pool.query(
    'SELECT * FROM audit_events WHERE session_id = $1 ORDER BY created_at ASC',
    [session_id]
  );
  return rows;
}
