import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.AUDIT_DB_PATH || './audit.db';

let db: Database;

async function initDb(): Promise<Database> {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      customer_id TEXT,
      event_type TEXT NOT NULL,
      tool_name TEXT,
      input_snapshot TEXT,
      output_snapshot TEXT,
      decision TEXT,
      rule_version TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_session ON audit_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_customer ON audit_events(customer_id);
  `);

  persist();
  return db;
}

function persist(): void {
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

export async function getDb(): Promise<Database> {
  if (!db) {
    await initDb();
  }
  return db;
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
  const database = await getDb();
  database.run(
    `INSERT INTO audit_events
      (session_id, customer_id, event_type, tool_name, input_snapshot, output_snapshot, decision, rule_version)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)`,
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
  const result = database.exec('SELECT last_insert_rowid() as id');
  persist();
  return result[0].values[0][0] as number;
}

export async function getAuditTrail(session_id: string): Promise<unknown[]> {
  const database = await getDb();
  const result = database.exec(
    'SELECT * FROM audit_events WHERE session_id = ? ORDER BY created_at ASC',
    [session_id]
  );
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
}
