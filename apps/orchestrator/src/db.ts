import pg from 'pg';

const { Pool } = pg;

// Pool is created lazily inside initDb() so env vars are available (ESM import hoisting
// means module-level code runs before dotenv config() in index.ts).
let _pool: InstanceType<typeof Pool>;

export function getPool(): InstanceType<typeof Pool> {
  return _pool;
}

export async function initDb(): Promise<void> {
  _pool = new Pool({ connectionString: process.env.SESSIONS_DATABASE_URL });
  await _pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      customer_id TEXT,
      product_code TEXT,
      messages    JSONB NOT NULL DEFAULT '[]',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
